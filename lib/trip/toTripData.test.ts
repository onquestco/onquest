import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripRows } from './schema';
import { toTripData } from './toTripData';

const TRIP = '00000000-0000-4000-8000-0000000000a1';
const PHOTO_1 = '00000000-0000-4000-8000-0000000000b1';
const PHOTO_2 = '00000000-0000-4000-8000-0000000000b2';
const PLACE_1 = '00000000-0000-4000-8000-0000000000c1';
const PLACE_2 = '00000000-0000-4000-8000-0000000000c2';
const MISSING = '00000000-0000-4000-8000-0000000000ff';

const defaults = { title: 'Default title', closingHeadline: 'Default closing' };

const emptyTrip: TripRows = {
  trip: {
    id: TRIP,
    slug: 'goa-2026',
    template_id: 'beach',
    visibility: 'public',
    title: null,
    short_title: null,
    start_date: null,
    end_date: null,
    cover_photo_id: null,
    seed: 42,
    content: { favourites: [], days: [] },
    published_at: null,
    updated_at: '2026-02-20T00:00:00Z',
  },
  owner: { handle: 'alex', name: null, avatar_url: null },
  photo_folder: 'user/trip',
  photos: [],
  places: [],
};

const fullTrip: TripRows = {
  ...emptyTrip,
  trip: {
    ...emptyTrip.trip,
    title: 'Salt in the Air',
    short_title: 'My Goa Trip',
    start_date: '2026-02-12',
    end_date: '2026-02-16',
    cover_photo_id: PHOTO_2,
    content: {
      destination: 'Goa',
      note: 'Slow days.',
      closingHeadline: 'Nowhere else to be.',
      favourites: [PLACE_2, MISSING],
      days: [
        {
          id: TRIP,
          title: 'Arrival',
          quote: 'Lost.',
          story: 'A story.',
          placeIds: [PLACE_1],
          photoIds: [PHOTO_2, MISSING, PHOTO_1],
        },
        { id: PHOTO_1, placeIds: [PLACE_2], photoIds: [] },
        { id: PHOTO_2, placeIds: [], photoIds: [] },
      ],
    },
  },
  owner: { handle: 'alex', name: 'Alex Morgan', avatar_url: 'https://example.com/a.webp' },
  photos: [
    { id: PHOTO_1, width: 1600, height: 1200, caption: 'Beach' },
    { id: PHOTO_2, width: 1200, height: 1600, caption: null },
  ],
  places: [
    { id: PLACE_1, name: 'Panjim', lat: 15.49, lng: 73.82, note: 'Coffee.', photo_id: PHOTO_1 },
    { id: PLACE_2, name: 'Palolem', lat: 15.01, lng: 74.02, note: null, photo_id: MISSING },
  ],
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.test');
});

describe('toTripData with an empty trip', () => {
  const trip = () => toTripData(emptyTrip, defaults);

  it('fills required text from defaults', () => {
    expect(trip()).toMatchObject({
      title: 'Default title',
      closingHeadline: 'Default closing',
      shortTitle: 'My Trip',
      statsLabel: '',
    });
  });

  it('uses the handle when there is no name', () => {
    expect(trip().traveler.name).toBe('alex');
  });

  it('leaves optional parts unset so templates skip them', () => {
    const { cover, note, dateLabel, destination, traveler } = trip();
    expect({ cover, note, dateLabel, destination, avatar: traveler.avatar }).toEqual({
      cover: undefined,
      note: undefined,
      dateLabel: undefined,
      destination: undefined,
      avatar: undefined,
    });
  });
});

describe('toTripData with a full trip', () => {
  const trip = () => toTripData(fullTrip, defaults);

  it('keeps the traveler text over defaults', () => {
    expect(trip()).toMatchObject({
      title: 'Salt in the Air',
      shortTitle: 'My Goa Trip',
      closingHeadline: 'Nowhere else to be.',
      note: 'Slow days.',
      dateLabel: '12 – 16 February',
      statsLabel: '3 days · 2 places',
    });
  });

  it('builds photo URLs from the storage folder', () => {
    expect(trip().photos[0]).toMatchObject({
      thumb: `https://db.test/storage/v1/object/public/photos/user/trip/${PHOTO_1}/thumb.webp`,
      display: `https://db.test/storage/v1/object/public/photos/user/trip/${PHOTO_1}/display.webp`,
    });
  });

  it('builds canonical URLs with the @handle', () => {
    expect(trip().url.endsWith('/@alex/goa-2026')).toBe(true);
    expect(trip().traveler.profileUrl?.endsWith('/@alex')).toBe(true);
  });

  it('uses the chosen cover photo, otherwise the first one', () => {
    expect(trip().cover?.id).toBe(PHOTO_2);
    const noCover = { ...fullTrip, trip: { ...fullTrip.trip, cover_photo_id: null } };
    expect(toTripData(noCover, defaults).cover?.id).toBe(PHOTO_1);
  });

  it('numbers days from 1 and keeps the saved photo order', () => {
    const [first] = trip().days;
    expect(first?.number).toBe(1);
    expect(first?.photos.map((photo) => photo.id)).toEqual([PHOTO_2, PHOTO_1]);
  });

  it('drops ids that no longer exist', () => {
    expect(trip().favourites.map((place) => place.id)).toEqual([PLACE_2]);
    expect(trip().places[1]?.photo).toBeUndefined();
  });

  it('titles an untitled day after its place, otherwise its number', () => {
    expect(trip().days.map((day) => day.title)).toEqual(['Arrival', 'Palolem', 'Day 3']);
  });
});

describe('toTripData stats', () => {
  it('counts days from the dates when none are saved yet', () => {
    const rows = {
      ...emptyTrip,
      trip: { ...emptyTrip.trip, start_date: '2026-02-12', end_date: '2026-02-16' },
    };
    expect(toTripData(rows, defaults).statsLabel).toBe('5 days');
  });
});
