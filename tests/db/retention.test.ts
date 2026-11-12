import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase } from './testDatabase';

// The weekly cleanup (spec A §3.1): archived rows older than 180 days and geocoder calls older
// than a day go; everything newer, and every live row, stays.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
const GOA = '00000000-0000-4000-8000-0000000000a1';

beforeAll(async () => {
  test = await createTestDatabase();
  const { db } = test;
  for (const [age, savedAt] of [
    ['200 days', '2020-01-01'],
    ['10 days', '2020-01-02'],
  ]) {
    await db.query(
      `insert into public.trips_archive select t.key, t.owner_key, t.slug, t.template_id, t.visibility,
         t.status, t.title, t.short_title, t.start_date, t.end_date, t.cover_photo_key, t.seed, t.content,
         t.word_count, t.published_at, t.photos, t.places, t.comments_on, t.search_text,
         t.published_draft_saved_at, t.started_at, $2::timestamptz, t.saved_by, t.save_reason,
         now() - $3::interval
       from public.trips t where t.key = $1`,
      [GOA, savedAt, age],
    );
    await db.query(
      `insert into public.profiles_archive select key, handle, name, bio, home_city, avatar_url, created_at,
         settings, $2::timestamptz, saved_by, save_reason, now() - $3::interval from public.profiles where key = $1`,
      [ALEX, savedAt, age],
    );
    await db.query(
      `insert into public.geocoder_calls (key, user_key, kind, called_at, saved_at, save_reason)
       values (gen_random_uuid(), $1, 'reverse', now() - $2::interval, now(), 'create')`,
      [ALEX, age === '10 days' ? '2 hours' : '3 days'],
    );
  }
  await db.exec('set role service_role');
  await db.query('select public.run_retention_cleanup()');
  await db.exec('reset role');
}, 30_000);

const count = async (sql: string) => Number((await test.db.query<{ n: number }>(sql)).rows[0]!.n);

describe('run_retention_cleanup', () => {
  it('removes archived rows older than 180 days and keeps newer ones', async () => {
    expect(await count('select count(*) n from public.trips_archive')).toBe(1);
    expect(await count('select count(*) n from public.profiles_archive')).toBe(1);
  });

  it('removes geocoder calls older than a day', async () => {
    expect(await count('select count(*) n from public.geocoder_calls')).toBe(1);
  });

  it('never touches live rows', async () => {
    expect(await count('select count(*) n from public.trips')).toBe(3);
    expect(await count('select count(*) n from public.profiles')).toBe(1);
  });
});
