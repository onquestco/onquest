import type { CaptionItem } from '@/lib/captions';
import type { QuestDocument } from '@/lib/trip/schema';

/**
 * Photos that get an automatic caption: those with a place (M4: no location, no caption) and no
 * caption yet, so nothing a person wrote is ever replaced. Built from the stored draft only.
 */
export function captionTargets(document: QuestDocument): CaptionItem[] {
  const towns = new Map(document.places.map((place) => [place.id, place.name]));
  return document.photos.flatMap((photo) => {
    const town = photo.placeId ? towns.get(photo.placeId) : undefined;
    if (!town || photo.caption) return [];
    return [{ photoId: photo.id, town, date: photo.date }];
  });
}

/** The document with the captions written in, marked as automatic. */
export function withCaptions(
  document: QuestDocument,
  captions: { photoId: string; caption: string }[],
): QuestDocument {
  const byPhoto = new Map(captions.map(({ photoId, caption }) => [photoId, caption]));
  return {
    ...document,
    photos: document.photos.map((photo) => {
      const caption = byPhoto.get(photo.id);
      return caption && !photo.caption ? { ...photo, caption, captionSource: 'auto' as const } : photo;
    }),
  };
}
