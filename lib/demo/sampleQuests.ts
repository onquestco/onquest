import type { Photo, TripData } from '@/lib/trip/types';
import { goaTrip } from './goaTrip';

// Sample Quests for /demo and visual checks (spec B, B-02): the smallest Quest, a full one, and an
// old long-day test trip. All built from the Goa sample's photos and places.

const all = goaTrip.photos;

/** 3 photos, no text, no dates: one page, no route page. */
export const smallQuest: TripData = {
  ...goaTrip,
  key: 'demo-small',
  id: 'demo-small',
  title: 'Panjim',
  destination: undefined,
  dateLabel: undefined,
  places: [],
  favourites: [],
  note: undefined,
  days: [{ number: 1, title: 'Page 1', places: [], photos: all.slice(0, 3) }],
};

/** 15 photos on 5 pages, every caption filled in, with dates. */
export const fullQuest: TripData = {
  ...goaTrip,
  key: 'demo-full',
  id: 'demo-full',
  days: Array.from({ length: 5 }, (_, index) => ({
    number: index + 1,
    title: goaTrip.days[index]?.title ?? `Day ${index + 1}`,
    dateLabel: `${12 + index} February`,
    places: goaTrip.days[index]?.places ?? [],
    photos: Array.from({ length: 3 }, (_, i) => {
      const photo = all[(index * 3 + i) % all.length] as Photo; // the index is always in range
      return { ...photo, id: `${photo.id}-${index}-${i}`, caption: 'Sunset at Palolem, again' };
    }),
  })),
};

/** An old v1 test trip: one day holding 7 photos. Plays as three continuation pages. */
export const oldLongDayQuest: TripData = {
  ...goaTrip,
  key: 'demo-old',
  id: 'demo-old',
  days: [{ number: 1, title: 'Arrival and Colorful Streets', places: goaTrip.places.slice(0, 2), photos: all.slice(0, 7) }],
};

export const sampleQuests = { goa: goaTrip, small: smallQuest, full: fullQuest, old: oldLongDayQuest } as const;
export type SampleQuestName = keyof typeof sampleQuests;
