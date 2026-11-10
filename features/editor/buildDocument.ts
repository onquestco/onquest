import type { QuestDocument } from '@/lib/trip/schema';
import type { Arrangement } from './arrange';
import { tripDateKey } from './groupDays';
import { defaultQuestTitle } from './pageTitle';

export type DraftPhotoInput = {
  id: string;
  width: number;
  height: number;
  takenAt: string | null;
  placeName?: string;
};

/** The first draft document after arranging. Place points come later from the geocoder (A-05). */
export function buildDocument(
  templateId: string,
  photos: DraftPhotoInput[],
  arrangement: Arrangement,
  createId: () => string,
  startedAt?: string,
): QuestDocument {
  const dates = photos.flatMap((photo) => (photo.takenAt ? [tripDateKey(photo.takenAt)] : [])).sort();
  return {
    templateId,
    title: defaultQuestTitle(
      photos.map((photo) => ({
        date: photo.takenAt ? tripDateKey(photo.takenAt) : undefined,
        placeName: photo.placeName,
      })),
    ),
    startDate: dates[0],
    endDate: dates.at(-1),
    coverPhotoId: arrangement.pages[0]?.photoIds[0],
    startedAt,
    content: {
      favourites: [],
      days: arrangement.pages.map((page) => ({
        id: createId(),
        title: page.title,
        titleSource: 'auto',
        startDate: page.startDate,
        endDate: page.endDate,
        placeIds: [],
        photoIds: page.photoIds,
      })),
    },
    photos: photos.map((photo) => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      takenAt: photo.takenAt ?? undefined,
      date: arrangement.dateById.get(photo.id),
    })),
    places: [],
  };
}
