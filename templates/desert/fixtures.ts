import { goaTrip } from '@/lib/demo/goaTrip';
import { fullQuest, smallQuest } from '@/lib/demo/sampleQuests';
import type { Day, Photo, TripData } from '@/lib/trip/types';

// Desert check trips, for desert.test.ts and /demo?template=desert&size=small|big|mixed.
// Built from the Goa sample's photos and places, like the other demo trips.

const desert = (trip: TripData): TripData => ({ ...trip, templateId: 'desert' });

const withoutCaptions = (photos: Photo[]) => photos.map((photo) => ({ ...photo, caption: undefined }));

/** 1 day / 3 photos / no text, no dates, no places: one page, no stamp, no route page. */
export const small = desert(smallQuest);

/** 5 pages / 15 photos, captions and dates on every page, the route page. */
export const big = desert(fullQuest);

const photos = goaTrip.photos;
const firstDays = goaTrip.days.slice(0, 3);

/** One page each with 1, 2 and 3 photos, and the Goa places (so stamps and the route page show). */
export const mixed = desert({
  ...goaTrip,
  key: 'demo-desert-mixed',
  id: 'demo-desert-mixed',
  days: firstDays.map(
    (day, index): Day => ({ ...day, photos: photos.slice(index * 3, index * 3 + index + 1) }),
  ),
});

/** Every page without a single caption, quote or story. */
export const noCaptions = desert({
  ...goaTrip,
  key: 'demo-desert-quiet',
  id: 'demo-desert-quiet',
  days: goaTrip.days.map(
    (day): Day => ({ ...day, quote: undefined, story: undefined, photos: withoutCaptions(day.photos) }),
  ),
});

/** Places but only one of them: no route page; the stamp still shows on that page. */
export const onePlace = desert({
  ...goaTrip,
  key: 'demo-desert-one-place',
  id: 'demo-desert-one-place',
  places: goaTrip.places.slice(0, 1),
});

export const desertFixtures = { small, big, mixed, noCaptions, onePlace };
export type DesertFixtureName = keyof typeof desertFixtures;
