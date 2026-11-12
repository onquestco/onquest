export type GpsPoint = { lat: number; lng: number };
export type GpsPhoto = GpsPoint & { photoId: string; takenAt: string | null };
export type PlaceSuggestion = GpsPoint & { photoIds: string[] };

const EARTH_RADIUS_KM = 6371;
const SAME_PLACE_KM = 1;
const MAX_SUGGESTIONS = 5; // a Quest has at most 5 pages; each lookup costs a geocoder call

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(from: GpsPoint, to: GpsPoint): number {
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const chord =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(chord));
}

/** Groups photo locations within about 1 km. The 5 biggest groups, largest first (ties in visit order). */
export function suggestPlaces(photos: GpsPhoto[]): PlaceSuggestion[] {
  const inTimeOrder = [...photos].sort(
    (first, second) => Date.parse(first.takenAt ?? '') - Date.parse(second.takenAt ?? '') || 0,
  );

  const suggestions: PlaceSuggestion[] = [];
  for (const photo of inTimeOrder) {
    const nearby = suggestions.find((suggestion) => distanceKm(suggestion, photo) <= SAME_PLACE_KM);
    if (nearby) nearby.photoIds.push(photo.photoId);
    else suggestions.push({ lat: photo.lat, lng: photo.lng, photoIds: [photo.photoId] });
  }
  // sort is stable, so equal-sized groups stay in the order they were visited
  return suggestions
    .sort((first, second) => second.photoIds.length - first.photoIds.length)
    .slice(0, MAX_SUGGESTIONS);
}
