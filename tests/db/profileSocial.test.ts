import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase, GOA, GOKARNA, SECRET } from './socialHelpers';
import { ALEX, STRANGER } from './testDatabase';

// Profiles, old handles, Quest cards and settings (spec C §3.7, §3.8, §4.3).

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
type Profile = {
  profile: { key: string; handle: string };
  stats: Record<string, number>;
  trips: { key: string; slug: string; page_count: number; photo_count: number; photo_folder: string }[];
  pins: unknown[];
  places: string[];
};
const profile = () => db.one<Profile>(undefined, `select public.get_profile('alex') as result`);
const savedAt = async () =>
  (await db.db.query<{ t: string }>('select saved_at::text t from public.profiles where key = $1', [ALEX]))
    .rows[0]!.t;

beforeAll(async () => {
  db = await createSocialDatabase();
}, 30_000);

describe('get_profile', () => {
  it('keeps the old fields and adds the key, places and card fields', async () => {
    const result = await profile();
    expect(result.profile).toMatchObject({ key: ALEX, handle: 'alex' });
    expect(result.stats).toMatchObject({ trips: 1, places: 2, countries: 1 });
    expect(result.trips).toHaveLength(1); // public only
    expect(result.trips[0]).toMatchObject({ key: GOA, slug: 'goa-2026', page_count: 0, photo_count: 0 });
    expect(result.trips[0]).toHaveProperty('published_at'); // migration 14: profile tiles say "5 days ago"
    expect(result.places).toEqual(['Fontainhas', 'Palolem Beach']);
    expect(result.pins).toHaveLength(2);
  });

  it('hides places and pins when the owner turns them off', async () => {
    await db.queryAs(ALEX, 'select public.save_profile_settings($1, $2)', [
      await savedAt(),
      { showPlaces: false },
    ]);
    const result = await profile();
    expect(result.places).toEqual([]);
    expect(result.pins).toEqual([]);
    expect(result.stats.places).toBe(2); // the numbers stay
  });
});

describe('save_profile_settings', () => {
  it('merges the switches and keeps everything else', async () => {
    await db.queryAs(ALEX, 'select public.save_profile_settings($1, $2)', [
      await savedAt(),
      { emailOnLike: false },
    ]);
    const row = (
      await db.db.query<{ settings: Record<string, unknown>; name: string }>(
        'select settings, name from public.profiles where key = $1',
        [ALEX],
      )
    ).rows[0]!;
    expect(row.settings).toMatchObject({ showPlaces: false, emailOnLike: false });
    expect(row.name).toBe('Alex Morgan');
  });

  it('refuses a stale save', async () => {
    await expect(
      db.queryAs(ALEX, 'select public.save_profile_settings($1, $2)', ['2000-01-01', { showPlaces: true }]),
    ).rejects.toThrow(/conflict/);
  });
});

describe('resolve_handle', () => {
  it('sends an old handle to the current one, and nothing for unknown ones', async () => {
    const saved = await savedAt();
    await db.queryAs(ALEX, 'select public.save_profile($1, $2)', [saved, { handle: 'alexm', name: 'Alex' }]);
    expect(await db.one(undefined, `select public.resolve_handle('alex') as result`)).toBe('alexm');
    expect(await db.one(undefined, `select public.resolve_handle('nobody') as result`)).toBeNull();
  });
});

describe('list_quest_cards', () => {
  it('returns public published Quests only, in the order asked', async () => {
    const cards = await db.one<{ key: string; path: string; places: string[] }[]>(
      undefined,
      'select public.list_quest_cards($1) as result',
      [[GOKARNA, SECRET, GOA]],
    );
    expect(cards.map((card) => card.key)).toEqual([GOA]);
    expect(cards[0]).toMatchObject({ path: '/@alexm/goa-2026', places: ['Fontainhas', 'Palolem Beach'] });
  });
});

describe('get_my_quest_counts', () => {
  it("counts likes and comments on the owner's Quests only", async () => {
    await db.like(STRANGER, GOA);
    await db.comment(STRANGER, GOA, 'Lovely');
    const counts = await db.one<{ key: string; like_count: number; comment_count: number }[]>(
      ALEX,
      'select public.get_my_quest_counts() as result',
    );
    expect(counts.find((row) => row.key === GOA)).toMatchObject({ like_count: 1, comment_count: 1 });
    expect(await db.one(STRANGER, 'select public.get_my_quest_counts() as result')).toEqual([]);
    expect(await db.one(STRANGER, 'select public.list_my_comment_trip_keys() as result')).toEqual([GOA]);
  });
});
