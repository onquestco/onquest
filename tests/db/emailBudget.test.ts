import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase } from './testDatabase';

// Notification emails stop at a daily budget so sign-in links always fit Resend's free 100 a day.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;

beforeAll(async () => {
  test = await createTestDatabase();
}, 30_000);

async function asServiceRole<T>(sql: string, params: unknown[] = []) {
  await test.db.exec('set role service_role');
  try {
    return (await test.db.query<T>(sql, params)).rows;
  } finally {
    await test.db.exec('reset role');
  }
}
const claim = async (limit: number) =>
  (await asServiceRole<{ ok: boolean }>(`select public.claim_email_budget('like', $1) as ok`, [limit]))[0]!
    .ok;

describe('claim_email_budget', () => {
  it('allows emails up to the limit, then refuses', async () => {
    expect([await claim(2), await claim(2), await claim(2)]).toEqual([true, true, false]);
  });

  it('counts only today (UTC)', async () => {
    await test.db.query(
      `insert into public.email_send_log (key, kind, saved_at, save_reason)
       select gen_random_uuid(), 'like', now() - interval '2 days', 'create' from generate_series(1, 10)`,
    );
    expect(await claim(3)).toBe(true);
  });

  it('stores no recipient or address', async () => {
    const columns = await test.db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'email_send_log'`,
    );
    expect(columns.rows.map((row) => row.column_name).sort()).toEqual(
      ['key', 'kind', 'save_reason', 'saved_at', 'saved_by'].sort(),
    );
  });

  it('is for the server only', async () => {
    await expect(test.queryAs(ALEX, `select public.claim_email_budget('like', 70)`)).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('save_profile_settings_as_admin', () => {
  it('turns one email switch off and keeps everything else', async () => {
    const before = (
      await test.db.query<Record<string, unknown>>('select * from public.profiles where key = $1', [ALEX])
    ).rows[0];
    await asServiceRole(`select public.save_profile_settings_as_admin($1, '{"emailOnLike": false}')`, [ALEX]);
    const after = (
      await test.db.query<Record<string, unknown>>('select * from public.profiles where key = $1', [ALEX])
    ).rows[0];
    expect(after).toMatchObject({
      handle: before?.handle,
      name: before?.name,
      bio: before?.bio,
      settings: { emailOnLike: false },
    });
    expect(after?.created_at).toEqual(before?.created_at);
  });
});
