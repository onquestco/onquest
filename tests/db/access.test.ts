import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, ALEX_PUBLIC_TRIP, createTestDatabase, STRANGER } from './testDatabase';

// Access rules from docs/03-security-visibility-seo.md Part A. Every RLS change needs a test here.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let queryAs: Db['queryAs'];

beforeAll(async () => {
  ({ queryAs } = await createTestDatabase());
}, 30_000);

type TripResult = { trip: Record<string, unknown> & { slug: string }; places: { name: string }[] };
type ProfileResult = { trips: { slug: string }[]; pins: unknown[]; stats: Record<string, number> };

const getTrip = async (handle: string, slug: string) =>
  (
    await queryAs<{ r: TripResult | null }>(undefined, 'select public.get_trip($1, $2) as r', [handle, slug])
  )[0]!.r;
const getProfile = async (handle: string) =>
  (await queryAs<{ r: ProfileResult | null }>(undefined, 'select public.get_profile($1) as r', [handle]))[0]!
    .r;

describe('logged-out visitors', () => {
  it.each(['profiles', 'trips', 'photos', 'places'])('cannot read the %s table directly', async (table) => {
    await expect(queryAs(undefined, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
  });
});

describe('get_trip', () => {
  it('returns a public trip', async () => {
    expect((await getTrip('alex', 'goa-2026'))?.trip.slug).toBe('goa-2026');
  });

  it('returns an unlisted trip only with the exact slug', async () => {
    expect((await getTrip('alex', 'gokarna-k3f9x2'))?.trip.slug).toBe('gokarna-k3f9x2');
    expect(await getTrip('alex', 'gokarna')).toBeNull();
  });

  it('hides private trips', async () => {
    expect(await getTrip('alex', 'secret-trip')).toBeNull();
  });

  it('does not expose the owner id', async () => {
    expect((await getTrip('alex', 'goa-2026'))?.trip).not.toHaveProperty('owner_id');
  });

  it('gives the storage folder for building photo URLs', async () => {
    const result = (await getTrip('alex', 'goa-2026')) as unknown as { photo_folder: string };
    expect(result.photo_folder).toBe(`${ALEX}/${ALEX_PUBLIC_TRIP}`);
  });

  it('returns places in visit order', async () => {
    const places = (await getTrip('alex', 'goa-2026'))?.places ?? [];
    expect(places.map((p) => p.name)).toEqual(['Fontainhas', 'Palolem Beach']);
  });
});

describe('get_profile', () => {
  it('shows only public trips and their pins', async () => {
    const profile = await getProfile('ALEX');
    expect(profile?.trips.map((t) => t.slug)).toEqual(['goa-2026']);
    expect(profile?.pins).toHaveLength(2);
    expect(profile?.stats).toEqual({ trips: 1, places: 2, countries: 1, days: 5 });
  });

  it('returns null for an unknown handle', async () => {
    expect(await getProfile('nobody')).toBeNull();
  });
});

describe('list_sitemap_trips', () => {
  it('lists only public trips with enough words', async () => {
    const rows = await queryAs<{ slug: string }>(undefined, 'select * from public.list_sitemap_trips()');
    expect(rows.map((r) => r.slug)).toEqual(['goa-2026']);
  });
});

describe('signed-in users', () => {
  it('see all of their own trips', async () => {
    expect(await queryAs(ALEX, 'select id from public.trips')).toHaveLength(3);
  });

  it("can't see other people's trips", async () => {
    expect(await queryAs(STRANGER, 'select id from public.trips')).toHaveLength(0);
  });

  it("can't change other people's trips", async () => {
    expect(await queryAs(STRANGER, `update public.trips set title = 'hacked' returning id`)).toHaveLength(0);
  });

  it("can't attach photos to other people's trips", async () => {
    await expect(
      queryAs(
        STRANGER,
        `insert into public.photos (id, trip_id, owner_id, width, height) values (gen_random_uuid(), $1, $2, 1, 1)`,
        [ALEX_PUBLIC_TRIP, STRANGER],
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('storage', () => {
  it("blocks uploads into someone else's folder", async () => {
    await expect(
      queryAs(STRANGER, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [
        `${ALEX}/trip/photo/thumb.webp`,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it('allows uploads into your own folder', async () => {
    await expect(
      queryAs(ALEX, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [
        `${ALEX}/trip/photo/thumb.webp`,
      ]),
    ).resolves.toEqual([]);
  });
});
