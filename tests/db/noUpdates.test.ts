import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, STRANGER } from './testDatabase';

// Decision 0001: rows never change. Nobody may update any live or archive table, and signed-in
// users can't insert or delete directly either: every write goes through a save function.
// Specs B and C add their tables here.

// Each table with one of its own columns, for an update that would otherwise be valid.
const TABLES: [string, string][] = [
  ['profiles', 'key'],
  ['profiles_archive', 'key'],
  ['handle_claims', 'handle'],
  ['trips', 'key'],
  ['trips_archive', 'key'],
  ['trip_drafts', 'key'],
  ['trip_drafts_archive', 'key'],
  ['removed_trip_urls', 'url_hash'],
  ['geocode_cache', 'cache_key'],
  ['geocoder_calls', 'key'],
  ['photos', 'id'],
  ['places', 'id'],
];

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;

beforeAll(async () => {
  test = await createTestDatabase();
}, 30_000);

async function asServiceRole(sql: string) {
  await test.db.exec('set role service_role');
  try {
    return await test.db.query(sql);
  } finally {
    await test.db.exec('reset role');
  }
}

describe.each(TABLES)('%s', (table, column) => {
  it('signed-in users cannot update, insert or delete', async () => {
    await expect(test.queryAs(STRANGER, `update public.${table} set ${column} = ${column}`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(test.queryAs(STRANGER, `insert into public.${table} default values`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(test.queryAs(STRANGER, `delete from public.${table}`)).rejects.toThrow(/permission denied/);
  });

  it('the service role cannot update', async () => {
    await expect(asServiceRole(`update public.${table} set ${column} = ${column}`)).rejects.toThrow(
      /permission denied/,
    );
  });
});
