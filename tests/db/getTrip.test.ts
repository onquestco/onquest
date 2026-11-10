import { beforeAll, describe, expect, it } from 'vitest';
import { TripRowsSchema } from '@/lib/trip/schema';
import { toTripData } from '@/lib/trip/toTripData';
import { ALEX, createTestDatabase } from './testDatabase';

// Migration 9 moves photos and places into the trip document and rewrites get_trip, get_profile
// and list_sitemap_trips. Built on data from before it (migrations 1–8 + the v8 seed, plus legacy
// photos), every field the old functions returned must come back unchanged.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
const before: Record<string, unknown> = {};
const after: Record<string, unknown> = {};

const PHOTO_A = '00000000-0000-4000-8000-0000000000c1';
const PHOTO_B = '00000000-0000-4000-8000-0000000000c2';
const PHOTO_C = '00000000-0000-4000-8000-0000000000c3';
const GOA = '00000000-0000-4000-8000-0000000000a1';

async function capture(into: Record<string, unknown>) {
  const one = async (sql: string) => (await test.queryAs<{ r: unknown }>(undefined, sql))[0]?.r;
  into.goa = await one(`select public.get_trip('alex', 'goa-2026') r`);
  into.gokarna = await one(`select public.get_trip('alex', 'gokarna-k3f9x2') r`);
  into.profile = await one(`select public.get_profile('alex') r`);
  into.sitemap = await test.queryAs(undefined, 'select * from public.list_sitemap_trips()');
}

beforeAll(async () => {
  test = await createTestDatabase({ upTo: 8, seed: 'tests/db/fixtures/seed-v8.sql' });
  // v1 photos, out of insert order, with and without captions and dates, and a place linked to one.
  await test.db.query(
    `insert into public.photos (id, trip_id, owner_id, width, height, taken_at, caption, sort) values
      ($1, $4, $5, 1600, 1200, '2026-02-12T08:30:00Z', 'Fontainhas walls', 1),
      ($2, $4, $5, 1200, 1600, null, null, 0),
      ($3, $4, $5, 1600, 1066, '2026-02-14T17:00:00Z', 'Sunset', 2)`,
    [PHOTO_A, PHOTO_B, PHOTO_C, GOA, ALEX],
  );
  await test.db.query(
    `insert into public.places (trip_id, name, lat, lng, geo_ref, country_code, photo_id, sort)
     values ($1, 'Old Goa', 15.5, 73.91, 'R123', 'IN', $2, 2)`,
    [GOA, PHOTO_A],
  );
  await capture(before);
  await test.migrateRest();
  await capture(after);
}, 60_000);

/** Every key the old object had, with the same value; new keys are allowed. */
function keepsEveryOldField(oldValue: unknown, newValue: unknown, path = ''): string[] {
  if (Array.isArray(oldValue)) {
    if (!Array.isArray(newValue) || newValue.length !== oldValue.length) return [`${path}: length`];
    return oldValue.flatMap((item, i) => keepsEveryOldField(item, newValue[i], `${path}[${i}]`));
  }
  if (oldValue && typeof oldValue === 'object') {
    if (!newValue || typeof newValue !== 'object') return [`${path}: missing`];
    return Object.entries(oldValue).flatMap(([key, value]) =>
      keepsEveryOldField(value, (newValue as Record<string, unknown>)[key], `${path}.${key}`),
    );
  }
  return JSON.stringify(oldValue) === JSON.stringify(newValue)
    ? []
    : [`${path}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`];
}

describe('get_trip after the backfill', () => {
  it.each(['goa', 'gokarna'])('returns every field it returned before for %s', (name) => {
    expect(before[name]).not.toBeNull();
    expect(keepsEveryOldField(before[name], after[name])).toEqual([]);
  });

  it('keeps photos and places in their old order, with the place linked to its photo', () => {
    const trip = after.goa as {
      photos: { id: string }[];
      places: { name: string; photo_id: string | null }[];
    };
    expect(trip.photos.map((photo) => photo.id)).toEqual([PHOTO_B, PHOTO_A, PHOTO_C]);
    expect(trip.places.map((place) => place.name)).toEqual(['Fontainhas', 'Palolem Beach', 'Old Goa']);
    expect(trip.places[2]?.photo_id).toBe(PHOTO_A);
  });

  it('returns absent captions, notes and photo links as null', () => {
    const trip = after.goa as { photos: { caption: unknown }[]; places: { note: unknown }[] };
    expect(trip.photos[0]).toHaveProperty('caption');
    expect(trip.photos[0]?.caption).toBeNull();
    expect(trip.places[2]?.note).toBeNull();
  });

  it('adds key, saved_at and comments_on', () => {
    const trip = (after.goa as { trip: Record<string, unknown> }).trip;
    expect(trip.key).toBe(GOA);
    expect(trip.saved_at).toBe(trip.updated_at);
    expect(trip.comments_on).toBe(true);
  });

  it('never returns owner or save details, search text, or photo dates and place links', () => {
    const text = JSON.stringify(after.goa);
    for (const field of [
      'owner_key',
      'owner_id',
      'saved_by',
      'save_reason',
      'search_text',
      'takenAt',
      '"date"',
      'placeId',
      'started_at',
    ]) {
      expect(text.includes(field)).toBe(false);
    }
  });
});

describe('the app reading the new output', () => {
  it('parses it with the schema the deployed code uses and builds the page data', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://db.test'; // photo URLs need a storage host
    const rows = TripRowsSchema.parse(after.goa);
    const trip = toTripData(rows, { title: 'Default', closingHeadline: 'Default' });
    expect(trip.key).toBe(GOA);
    expect(trip.photos).toHaveLength(3);
    expect(trip.places.map((place) => place.name)).toEqual(['Fontainhas', 'Palolem Beach', 'Old Goa']);
  });

  it('parsed the old output too, so a rollback still renders', () => {
    expect(TripRowsSchema.safeParse(before.goa).success).toBe(true);
  });
});

describe('get_profile and the sitemap after the backfill', () => {
  it('returns the same profile, stats, trips and pins', () => {
    expect(keepsEveryOldField(before.profile, after.profile)).toEqual([]);
  });

  it('returns the same sitemap rows', () => {
    expect(after.sitemap).toEqual(before.sitemap);
  });
});

describe('the backfilled document', () => {
  it('holds photo dates for the owner only, in the document', async () => {
    const [trip] = await test.queryAs<{ photos: Record<string, unknown>[] }>(
      ALEX,
      'select photos from public.trips where key = $1',
      [GOA],
    );
    expect(trip?.photos[1]).toMatchObject({
      id: PHOTO_A,
      takenAt: '2026-02-12T08:30:00Z',
      date: '2026-02-12',
    });
    expect(trip?.photos[0]).not.toHaveProperty('takenAt');
  });

  it('gives every trip a draft with the same document', async () => {
    const rows = await test.queryAs<{ same: boolean }>(
      ALEX,
      `select d.photos = t.photos and d.places = t.places and d.content = t.content as same
       from public.trips t join public.trip_drafts d using (key)`,
    );
    expect(rows.map((row) => row.same)).toEqual([true, true, true]);
  });

  it('has no defaults left on seed, visibility, status or comments_on', async () => {
    await expect(
      test.db.query(
        `insert into public.trips (key, owner_key, slug, template_id, content, word_count, saved_at, save_reason)
         values (gen_random_uuid(), $1, 'no-defaults', 'beach', '{}', 0, now(), 'create')`,
        [ALEX],
      ),
    ).rejects.toThrow(/null value/);
  });
});
