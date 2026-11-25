import { goaTrip } from '@/lib/demo/goaTrip';
import { fullQuest, smallQuest } from '@/lib/demo/sampleQuests';
import type { Day, Photo, TripData } from '@/lib/trip/types';

// Mountain ('alpine') check trips, for alpine.test.ts and /demo?template=alpine&size=small|big|mixed.
// Built from the Goa sample's photos and places, like the other demo trips.

const alpine = (trip: TripData): TripData => ({ ...trip, templateId: 'alpine' });

const withoutCaptions = (photos: Photo[]) => photos.map((photo) => ({ ...photo, caption: undefined }));

/** 1 day / 3 photos / no text, no dates, no places: one page, no stamp, no trail page. */
export const small = alpine(smallQuest);

/** 5 pages / 15 photos, captions and dates on every page, the trail page. */
export const big = alpine(fullQuest);

const photos = goaTrip.photos;
const firstDays = goaTrip.days.slice(0, 3);

/** One page each with 1, 2 and 3 photos, and the Goa places (so stamps and the trail page show). */
export const mixed = alpine({
  ...goaTrip,
  key: 'demo-alpine-mixed',
  id: 'demo-alpine-mixed',
  days: firstDays.map(
    (day, index): Day => ({ ...day, photos: photos.slice(index * 3, index * 3 + index + 1) }),
  ),
});

/** Every page without a single caption, quote or story. */
export const noCaptions = alpine({
  ...goaTrip,
  key: 'demo-alpine-quiet',
  id: 'demo-alpine-quiet',
  days: goaTrip.days.map(
    (day): Day => ({ ...day, quote: undefined, story: undefined, photos: withoutCaptions(day.photos) }),
  ),
});

/** Places but only one of them: no trail page; the stamp still shows on that page. */
export const onePlace = alpine({
  ...goaTrip,
  key: 'demo-alpine-one-place',
  id: 'demo-alpine-one-place',
  places: goaTrip.places.slice(0, 1),
});

export const alpineFixtures = { small, big, mixed, noCaptions, onePlace };
export type AlpineFixtureName = keyof typeof alpineFixtures;
