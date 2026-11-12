import type { TripData } from './types';

/** Words of real text on a trip page. Thin pages stay out of search (docs/03 §C.1). */
export function countWords(trip: TripData): number {
  const texts = [
    trip.title,
    trip.note,
    ...trip.days.flatMap((day) => [day.title, day.quote, day.story]),
    ...trip.places.map((place) => place.note),
  ];
  return texts.join(' ').split(/\s+/).filter(Boolean).length;
}
