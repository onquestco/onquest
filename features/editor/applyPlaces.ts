import type { GeoPlace } from '@/lib/geo';
import type { QuestDocument, TripPlace } from '@/lib/trip/schema';
import { retitle } from './pageEdits';
import { defaultQuestTitle } from './pageTitle';
import type { PlaceSuggestion } from './suggestPlaces';

const MAX_PLACES_PER_PAGE = 6; // DaySchema.placeIds

/**
 * Puts the town names found while arranging into the draft (spec A §3.2, "Finding places…"):
 * one place per distinct town, each photo in a named group gets its place, each page lists the
 * places of its photos in order, and automatic titles are worked out again with the names.
 * `named[i]` is the town for `groups[i]`, or null when the geocoder had nothing in time.
 */
export function applyPlaces(
  document: QuestDocument,
  groups: PlaceSuggestion[],
  named: (GeoPlace | null)[],
  createId: () => string,
  autoTitle: boolean,
): QuestDocument {
  const places: TripPlace[] = [...document.places];
  const placeIdByPhoto = new Map<string, string>();

  groups.forEach((group, index) => {
    const town = named[index];
    if (!town) return;
    const sameTown = places.find((place) =>
      town.geoRef ? place.geoRef === town.geoRef : place.name === town.name,
    );
    const place = sameTown ?? {
      id: createId(),
      name: town.name.slice(0, 60),
      lat: town.lat,
      lng: town.lng,
      geoRef: town.geoRef ?? undefined,
      city: town.city ?? undefined,
      countryCode: town.countryCode ?? undefined,
      photoId: group.photoIds[0],
    };
    if (!sameTown) places.push(place);
    group.photoIds.forEach((photoId) => placeIdByPhoto.set(photoId, place.id));
  });
  if (placeIdByPhoto.size === 0) return document;

  const photos = document.photos.map((photo) => {
    const placeId = placeIdByPhoto.get(photo.id);
    return placeId && !photo.placeId ? { ...photo, placeId } : photo;
  });
  const placeOf = new Map(photos.map((photo) => [photo.id, photo.placeId]));
  const days = document.content.days.map((page) => {
    const ids = page.photoIds.flatMap((photoId) => placeOf.get(photoId) ?? []);
    return { ...page, placeIds: [...new Set(ids)].slice(0, MAX_PLACES_PER_PAGE) };
  });

  const withPlaces = retitle({ ...document, photos, places, content: { ...document.content, days } });
  if (!autoTitle) return withPlaces;
  const placeName = new Map(places.map((place) => [place.id, place.name]));
  const title = defaultQuestTitle(
    photos.map((photo) => ({
      date: photo.date,
      placeName: photo.placeId ? placeName.get(photo.placeId) : undefined,
    })),
  );
  return { ...withPlaces, title: title ?? withPlaces.title };
}
