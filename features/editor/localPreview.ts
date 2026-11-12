import type { Photo, TripData } from '@/lib/trip/types';

/**
 * Swaps stored photo URLs for this device's local previews, so the preview plays before (or
 * without) uploads finishing. Photos with no local preview keep their stored URLs.
 */
export function withLocalPreviews(trip: TripData, previews: Record<string, string>): TripData {
  const local = (photo: Photo): Photo => {
    const url = previews[photo.id];
    return url ? { ...photo, thumb: url, display: url } : photo;
  };
  const maybe = (photo?: Photo) => (photo ? local(photo) : undefined);
  const places = trip.places.map((place) => ({ ...place, photo: maybe(place.photo) }));
  return {
    ...trip,
    cover: maybe(trip.cover),
    photos: trip.photos.map(local),
    places,
    favourites: trip.favourites.map((place) => ({ ...place, photo: maybe(place.photo) })),
    days: trip.days.map((day) => ({
      ...day,
      photos: day.photos.map(local),
      places: day.places.map((place) => ({ ...place, photo: maybe(place.photo) })),
    })),
  };
}
