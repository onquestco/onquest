import { goaTrip } from '@/lib/demo/goaTrip';
import { fullQuest, smallQuest } from '@/lib/demo/sampleQuests';
import type { Day, Photo, TripData } from '@/lib/trip/types';

// Winter check trips, for winter.test.ts and /demo?template=winter&size=small|big|mixed.
// Built from the Goa sample's photos and places, like the other demo trips.

const winter = (trip: TripData): TripData => ({ ...trip, templateId: 'winter' });

const withoutCaptions = (photos: Photo[]) => photos.map((photo) => ({ ...photo, caption: undefined }));

/** 1 day / 3 photos / no text, no dates, no places: one page, no stamp, no route page. */
export const small = winter(smallQuest);

/** 5 pages / 15 photos, captions and dates on every page, the route page. */
export const big = winter(fullQuest);

const photos = goaTrip.photos;
const firstDays = goaTrip.days.slice(0, 3);

/** One page each with 1, 2 and 3 photos, and the Goa places (so stamps and the route page show). */
export const mixed = winter({
  ...goaTrip,
  key: 'demo-winter-mixed',
  id: 'demo-winter-mixed',
  days: firstDays.map(
    (day, index): Day => ({ ...day, photos: photos.slice(index * 3, index * 3 + index + 1) }),
  ),
});

/** Every page without a single caption, quote or story. */
export const noCaptions = winter({
  ...goaTrip,
  key: 'demo-winter-quiet',
  id: 'demo-winter-quiet',
  days: goaTrip.days.map(
    (day): Day => ({ ...day, quote: undefined, story: undefined, photos: withoutCaptions(day.photos) }),
  ),
});

/** Places but only one of them: no route page; the stamp still shows on that page. */
export const onePlace = winter({
  ...goaTrip,
  key: 'demo-winter-one-place',
  id: 'demo-winter-one-place',
  places: goaTrip.places.slice(0, 1),
});

export const winterFixtures = { small, big, mixed, noCaptions, onePlace };
export type WinterFixtureName = keyof typeof winterFixtures;
