import type { Photo, Place, TripData } from '@/lib/trip/types';

// The order a Quest reads in (spec B §3.1): cover, one page per stored day of up to 3 photos,
// then a route page, looping back to the cover. Pure, so it's tested without a browser.

const PHOTOS_PER_PAGE = 3; // same as lib/trip/limits; templates don't import product limits

export type QuestPage =
  | { kind: 'cover' }
  | {
      kind: 'photos';
      dayIndex: number;
      title: string;
      dateLabel?: string;
      photos: Photo[];
      /** Index of the first photo within its day, for memory-sheet keys. */
      firstPhotoIndex: number;
      places: Place[];
      /** 1 for a day's first page; 2+ for continuation pages of old, long days. */
      part: number;
    }
  | { kind: 'route' };

export function toQuestPages(trip: TripData): QuestPage[] {
  const photoPages = trip.days.flatMap((day, dayIndex) =>
    Array.from({ length: Math.ceil(day.photos.length / PHOTOS_PER_PAGE) }, (_, part) => ({
      kind: 'photos' as const,
      dayIndex,
      title: part === 0 ? day.title : `${day.title} · ${part + 1}`,
      dateLabel: day.dateLabel,
      photos: day.photos.slice(part * PHOTOS_PER_PAGE, (part + 1) * PHOTOS_PER_PAGE),
      firstPhotoIndex: part * PHOTOS_PER_PAGE,
      places: day.places,
      part: part + 1,
    })),
  );
  // Nothing to draw a path between with fewer than 2 places: the last photo page loops instead.
  const route: QuestPage[] = trip.places.length >= 2 ? [{ kind: 'route' }] : [];
  return [{ kind: 'cover' }, ...photoPages, ...route];
}
