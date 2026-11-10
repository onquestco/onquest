import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase, STRANGER } from './testDatabase';
import { tripFunctions } from './tripHelpers';

// delete_trip is the one real delete (0001 rule 7). Built on pre-migration-9 data, so the legacy
// photos and places rows are there to be removed too.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
let trips: ReturnType<typeof tripFunctions>;
const GOA = '00000000-0000-4000-8000-0000000000a1';
const GOKARNA = '00000000-0000-4000-8000-0000000000a2';

beforeAll(async () => {
  test = await createTestDatabase({ upTo: 8, seed: 'tests/db/fixtures/seed-v8.sql' });
  await test.migrateRest();
  trips = tripFunctions(test.queryAs);
  await test.addUser(STRANGER);
}, 60_000);

const count = async (sql: string, params: unknown[] = []) =>
  Number((await test.db.query<{ n: number }>(sql, params)).rows[0]!.n);

describe('delete_trip', () => {
  it("can't delete someone else's Quest", async () => {
    await expect(trips.remove(STRANGER, GOA)).rejects.toThrow(/not found/);
  });

  it('removes the live row, draft, archives and legacy rows, and leaves a tombstone', async () => {
    const { trip } = await trips.rows(ALEX, GOA);
    await trips.setComments(ALEX, GOA, trip!.saved_at_text, false); // so there's an archive row
    expect(await count('select count(*) n from public.places where trip_id = $1', [GOA])).toBe(2);

    const result = await trips.remove(ALEX, GOA);
    expect(result).toEqual({ handles: ['alex'], slug: 'goa-2026' });
    for (const table of ['trips', 'trips_archive', 'trip_drafts', 'trip_drafts_archive']) {
      expect(await count(`select count(*) n from public.${table} where key = $1`, [GOA])).toBe(0);
    }
    expect(await count('select count(*) n from public.places where trip_id = $1', [GOA])).toBe(0);
    expect(
      await count(
        `select count(*) n from public.removed_trip_urls where url_hash = public.trip_url_hash('alex', 'goa-2026')`,
      ),
    ).toBe(1);
  });

  it("leaves the owner's other Quests alone", async () => {
    expect(await count('select count(*) n from public.trips where key = $1', [GOKARNA])).toBe(1);
    expect(await count('select count(*) n from public.places where trip_id = $1', [GOKARNA])).toBe(1);
  });
});
