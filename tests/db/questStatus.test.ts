import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase, GOKARNA, SECRET } from './socialHelpers';
import { ALEX } from './testDatabase';
import { tripFunctions } from './tripHelpers';

// Private and removed links (spec B §3.2): visitors get only the word, never a key.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
const status = (handle: string, slug: string) =>
  db.one<string | null>(undefined, 'select public.get_trip_status($1, $2) as result', [handle, slug]);

beforeAll(async () => {
  db = await createSocialDatabase();
  await tripFunctions(db.queryAs).remove(ALEX, GOKARNA);
}, 30_000);

describe('get_trip_status', () => {
  it('says private for a private Quest, and nothing else', async () => {
    expect(await status('alex', 'secret-trip')).toBe('private');
    expect(await status('ALEX', 'Secret-Trip')).toBe('private');
  });

  it('says removed for a deleted Quest’s old link', async () => {
    expect(await status('alex', 'gokarna-k3f9x2')).toBe('removed');
  });

  it('is null for public Quests and unknown links', async () => {
    expect(await status('alex', 'goa-2026')).toBeNull();
    expect(await status('alex', 'never-existed')).toBeNull();
    expect(await status('nobody', 'secret-trip')).toBeNull();
  });
});

describe('get_unavailable_trip_key', () => {
  it('is refused to visitors and signed-in users', async () => {
    await expect(
      db.queryAs(undefined, `select public.get_unavailable_trip_key('alex', 'secret-trip')`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.queryAs(ALEX, `select public.get_unavailable_trip_key('alex', 'secret-trip')`),
    ).rejects.toThrow(/permission denied/);
  });

  it('gives the server the key for the quest_unavailable event', async () => {
    await db.db.exec('set role service_role');
    try {
      const keys = await db.db.query<{ key: string }>(
        `select public.get_unavailable_trip_key('alex', 'secret-trip') as key
         union all select public.get_unavailable_trip_key('alex', 'gokarna-k3f9x2')`,
      );
      expect(keys.rows.map((row) => row.key)).toEqual([SECRET, GOKARNA]);
    } finally {
      await db.db.exec('reset role');
    }
  });
});
