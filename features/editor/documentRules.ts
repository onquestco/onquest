import { MAX_PAGES, MAX_PHOTOS, PHOTOS_PER_PAGE } from '@/lib/trip/limits';
import type { QuestDocument } from '@/lib/trip/schema';

// The rules a saved draft must keep (spec A §4.2 saveQuestDraft). The stored schema is wider so
// old trips parse; these are the MVP limits. Returns what's wrong, or null.

export type DocumentProblem =
  | 'too_many_photos'
  | 'too_many_pages'
  | 'page_too_full'
  | 'unknown_photo'
  | 'unknown_place'
  | 'photo_on_two_pages';

export function documentProblem(document: QuestDocument): DocumentProblem | null {
  if (document.photos.length > MAX_PHOTOS) return 'too_many_photos';
  const days = document.content.days;
  if (days.length > MAX_PAGES) return 'too_many_pages';

  const photoIds = new Set(document.photos.map((photo) => photo.id));
  const placeIds = new Set(document.places.map((place) => place.id));
  const placed = new Set<string>();
  for (const day of days) {
    if (day.photoIds.length > PHOTOS_PER_PAGE) return 'page_too_full';
    for (const id of day.photoIds) {
      if (!photoIds.has(id)) return 'unknown_photo';
      if (placed.has(id)) return 'photo_on_two_pages';
      placed.add(id);
    }
    if (day.placeIds.some((id) => !placeIds.has(id))) return 'unknown_place';
  }
  return null;
}
