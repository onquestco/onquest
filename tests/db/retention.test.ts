import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase } from './testDatabase';

// The weekly cleanup (spec A §3.1): archived rows older than 180 days and geocoder calls older
// than a day go; everything newer, and every live row, stays.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
const GOA = '00000000-0000-4000-8000-0000000000a1';
const BLOG = '00000000-0000-4000-8000-0000000000c1';

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
  // Blogs (migration 16): blog archives 180 days, blog drafts 30 (autosave archives on every
  // save), feature access 180.
  for (const [age, savedAt] of [
    ['200 days', '2020-01-01'],
    ['40 days', '2020-01-02'],
    ['10 days', '2020-01-03'],
  ]) {
    await db.query(
      `insert into public.blogs_archive (key, owner_key, slug, status, visibility, title, body, photos,
         place, linked_trip_key, comments_on, search_text, word_count, published_at,
         published_draft_saved_at, started_at, saved_at, saved_by, save_reason, archived_at)
       values ($1, $2, null, 'draft', 'public', null, '', '[]', null, null, true, '', 0, null, null, null,
         $3::timestamptz, $2, 'create', now() - $4::interval)`,
      [BLOG, ALEX, savedAt, age],
    );
    await db.query(
      `insert into public.blog_drafts_archive (key, owner_key, title, body, photos, place, linked_trip_key,
         started_at, saved_at, saved_by, save_reason, archived_at)
       values ($1, $2, null, '', '[]', null, null, null, $3::timestamptz, $2, 'save', now() - $4::interval)`,
      [BLOG, ALEX, savedAt, age],
    );
    await db.query(
      `insert into public.feature_access_archive (key, feature, user_key, saved_at, saved_by, save_reason, archived_at)
       values ($1, 'blogs', $2, $3::timestamptz, null, 'create', now() - $4::interval)`,
      [BLOG, ALEX, savedAt, age],
    );
  }
  // Blog likes and comments (migration 17): 90 days, like the Quest ones.
  for (const [age, savedAt] of [
    ['100 days', '2020-01-01'],
    ['10 days', '2020-01-02'],
  ]) {
    await db.query(
      `insert into public.blog_likes_archive (key, blog_key, user_key, saved_at, saved_by, save_reason, archived_at)
       values ($1, $1, $2, $3::timestamptz, $2, 'create', now() - $4::interval)`,
      [BLOG, ALEX, savedAt, age],
    );
    await db.query(
      `insert into public.blog_comments_archive (key, blog_key, author_key, body, saved_at, saved_by, save_reason,
         archived_at)
       values ($1, $1, $2, 'Nice', $3::timestamptz, $2, 'delete', now() - $4::interval)`,
      [BLOG, ALEX, savedAt, age],
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

  it('keeps blog archives 180 days, blog draft archives 30 days and feature access 180 days', async () => {
    expect(await count('select count(*) n from public.blogs_archive')).toBe(2);
    expect(await count('select count(*) n from public.blog_drafts_archive')).toBe(1);
    expect(await count('select count(*) n from public.feature_access_archive')).toBe(2);
  });

  it('keeps blog like and comment archives 90 days', async () => {
    expect(await count('select count(*) n from public.blog_likes_archive')).toBe(1);
    expect(await count('select count(*) n from public.blog_comments_archive')).toBe(1);
  });

  it('removes geocoder calls older than a day', async () => {
    expect(await count('select count(*) n from public.geocoder_calls')).toBe(1);
  });

  it('never touches live rows', async () => {
    expect(await count('select count(*) n from public.trips')).toBe(3);
    expect(await count('select count(*) n from public.profiles')).toBe(1);
  });
});
