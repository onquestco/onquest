import type { Photo, TripData } from '@/lib/trip/types';

// The memory sheet is the bottom panel that opens when a photo, pin or note is tapped.
// Elements opt in with data-opens="<key>". Keys:
//   place:<index>            a place (from a map pin or a place photo)
//   day:<index>[:<photo>]    a day, optionally starting at a photo
//   note                     the closing note

export type SheetPhoto = { src: string; caption?: string };

export type Sheet = {
  kicker: string;
  title: string;
  text?: string;
  tags: string[];
  quote?: string;
  photos: SheetPhoto[];
  showMapLink: boolean;
};

const toSheetPhoto = (photo: Photo, caption?: string): SheetPhoto => ({
  src: photo.display,
  caption: photo.caption ?? caption,
});

export const placeKey = (index: number) => `place:${index}`;
export const dayKey = (index: number, photoIndex = 0) => `day:${index}:${photoIndex}`;
export const NOTE_KEY = 'note';

/** Splits "day:2:1" into the sheet id "day:2" and the starting photo 1. */
export function parseSheetKey(key: string): { id: string; photoIndex: number } {
  const [type, index, photoIndex] = key.split(':');
  if (type === 'day') return { id: `day:${index}`, photoIndex: Number(photoIndex ?? 0) || 0 };
  return { id: key, photoIndex: 0 };
}

/** All sheets for a trip, keyed by sheet id. Serializable, so it can be passed to the client. */
export function buildSheets(trip: TripData): Record<string, Sheet> {
  const sheets: Record<string, Sheet> = {};

  trip.places.forEach((place, i) => {
    sheets[`place:${i}`] = {
      kicker: `Stop ${i + 1} of ${trip.places.length}`,
      title: place.name,
      text: place.note,
      tags: [],
      photos: place.photo ? [toSheetPhoto(place.photo, place.name)] : [],
      showMapLink: true,
    };
  });

  trip.days.forEach((day, i) => {
    sheets[`day:${i}`] = {
      kicker: `Day ${String(day.number).padStart(2, '0')}`,
      title: day.title,
      text: day.story,
      tags: day.places.map((place) => place.name),
      quote: day.quote ? `“${day.quote}”` : undefined,
      photos: day.photos.map((photo) => toSheetPhoto(photo)),
      showMapLink: false,
    };
  });

  if (trip.note) {
    const avatar = trip.traveler.avatar;
    sheets[NOTE_KEY] = {
      kicker: 'A note from the traveler',
      title: trip.traveler.name,
      text: trip.note,
      tags: [],
      photos: avatar ? [toSheetPhoto(avatar, trip.closingHeadline)] : [],
      showMapLink: false,
    };
  }

  return sheets;
}

/** Which sheet a photo should open: its place if it's a place photo, else its day. */
export function sheetKeyForPhoto(trip: TripData, photoId: string): string | undefined {
  const placeIndex = trip.places.findIndex((place) => place.photo?.id === photoId);
  if (placeIndex >= 0) return placeKey(placeIndex);

  for (const [dayIndex, day] of trip.days.entries()) {
    const photoIndex = day.photos.findIndex((photo) => photo.id === photoId);
    if (photoIndex >= 0) return dayKey(dayIndex, photoIndex);
  }
  return undefined;
}

/** The place name for a photo, used as a polaroid label. */
export function placeNameForPhoto(trip: TripData, photoId: string): string | undefined {
  return trip.places.find((place) => place.photo?.id === photoId)?.name;
}
