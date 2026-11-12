import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase, STRANGER } from './testDatabase';

// The Nominatim limiter and cache (spec A §3.4): one call a second across every server instance,
// per-user limits, and a cache users can't write to.

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
const claim = async (user: string, kind: string) =>
  (
    await asServiceRole<{ wait: number }>('select public.claim_geocoder_slot($1, $2) as wait', [user, kind])
  )[0]!.wait;

describe('claim_geocoder_slot', () => {
  it('lets the first call go and makes the next one wait', async () => {
    expect(await claim(ALEX, 'reverse')).toBe(0);
    const wait = await claim(STRANGER, 'search');
    expect(wait).toBeGreaterThan(0);
    expect(wait <= 1000).toBe(true);
  });

  it('refuses a user who made 10 reverse lookups in the last 10 minutes', async () => {
    await test.db.query(
      `insert into public.geocoder_calls (key, user_key, kind, called_at, saved_at, save_reason)
       select gen_random_uuid(), $1, 'reverse', now() - interval '5 minutes', now(), 'create'
       from generate_series(1, 10)`,
      [STRANGER],
    );
    expect(await claim(STRANGER, 'reverse')).toBe(-1);
  });

  it('is for the server only', async () => {
    await expect(
      test.queryAs(ALEX, `select public.claim_geocoder_slot($1, 'reverse')`, [ALEX]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('geocode cache', () => {
  it('keeps the first answer for a key', async () => {
    await asServiceRole(
      `select public.geocode_cache_put('rev:10:15.49:73.82', '{"places": [{"name": "Panjim"}]}')`,
    );
    await asServiceRole(
      `select public.geocode_cache_put('rev:10:15.49:73.82', '{"places": [{"name": "Other"}]}')`,
    );
    const rows = await asServiceRole<{ cache_key: string; result: unknown }>(
      `select * from public.geocode_cache_get(array['rev:10:15.49:73.82', 'rev:10:0.00:0.00'])`,
    );
    expect(rows).toEqual([{ cache_key: 'rev:10:15.49:73.82', result: { places: [{ name: 'Panjim' }] } }]);
  });

  it("can't be read or written by users", async () => {
    await expect(test.queryAs(ALEX, `select public.geocode_cache_put('x', '{}')`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(test.queryAs(ALEX, `select * from public.geocode_cache_get(array['x'])`)).rejects.toThrow(
      /permission denied/,
    );
  });
});
