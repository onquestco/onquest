import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './testDatabase';

// Migration 8 must ship on its own (spec A §8): with only migrations 1–8 and the seed, the public
// functions return exactly what they returned before (fixture captured from migrations 1–7).

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'tests', 'db', 'fixtures', 'getTrip-v1.json'), 'utf8'),
);

// Values the seed makes fresh on every run (now(), random seed, generated place ids).
const VARIES = new Set(['seed', 'updated_at', 'published_at']);
function normalise(value: unknown, key?: string, parent?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => normalise(item, undefined, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        VARIES.has(name) || (parent === 'places' && name === 'id') ? '<varies>' : normalise(item, name, key),
      ]),
    );
  }
  return value;
}

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let queryAs: Db['queryAs'];

beforeAll(async () => {
  ({ queryAs } = await createTestDatabase({ upTo: 8 }));
}, 30_000);

const one = async (sql: string, params: unknown[] = []) =>
  (await queryAs<{ result: unknown }>(undefined, sql, params))[0]?.result;

describe('after migration 8 alone', () => {
  it.each(['goa-2026', 'gokarna-k3f9x2'])('get_trip returns the same %s', async (slug) => {
    expect(normalise(await one('select public.get_trip($1, $2) as result', ['alex', slug]))).toEqual(
      fixture.getTrip[slug],
    );
  });

  it('get_profile returns the same profile, stats, trips and pins', async () => {
    expect(normalise(await one(`select public.get_profile('alex') as result`))).toEqual(fixture.getProfile);
  });

  it('list_sitemap_trips returns the same rows', async () => {
    const rows = await queryAs(undefined, 'select handle, slug from public.list_sitemap_trips()');
    expect(rows).toEqual(fixture.sitemap);
  });
});
