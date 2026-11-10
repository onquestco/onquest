import type { QuestDocument } from '@/lib/trip/schema';
import { MAX_PAGES, MIN_PHOTOS_TO_PUBLISH, PHOTOS_PER_PAGE } from '@/lib/trip/limits';
import { pageDates, pageTitle } from './pageTitle';

// Every edit on the Review pages screen, as pure functions on the draft document (spec A, screen 5).
// Each returns a new document, or a reason it can't be done; the screen keeps the old one for Undo.

export type EditResult = { ok: true; document: QuestDocument } | { ok: false; reason: string };

export const NEED_THREE = `A Quest needs at least ${MIN_PHOTOS_TO_PUBLISH} photos. Replace this one instead.`;

type Page = QuestDocument['content']['days'][number];

const withPages = (document: QuestDocument, days: Page[]): QuestDocument =>
  retitle({
    ...document,
    content: { ...document.content, days: days.filter((page) => page.photoIds.length > 0) },
  });

const photoCount = (document: QuestDocument) =>
  document.content.days.reduce((sum, page) => sum + page.photoIds.length, 0);

/** Page titles and dates follow their photos until the traveller renames the page. */
export function retitle(document: QuestDocument): QuestDocument {
  const photoById = new Map(document.photos.map((photo) => [photo.id, photo]));
  const placeName = new Map(document.places.map((place) => [place.id, place.name]));
  const allDates = document.photos.flatMap((photo) => (photo.date ? [photo.date] : [])).sort();
  const days = document.content.days.map((page, index) => {
    const info = page.photoIds.map((id) => {
      const photo = photoById.get(id);
      return { date: photo?.date, placeName: photo?.placeId ? placeName.get(photo.placeId) : undefined };
    });
    const dates = pageDates(info);
    return {
      ...page,
      startDate: dates.startDate,
      endDate: dates.endDate,
      title: page.titleSource === 'auto' ? pageTitle(info, index + 1, allDates[0]) : page.title,
    };
  });
  return { ...document, content: { ...document.content, days } };
}

export function renamePage(document: QuestDocument, pageIndex: number, title: string): QuestDocument {
  const days = document.content.days.map((page, index) =>
    index === pageIndex ? { ...page, title: title.trim() || undefined, titleSource: 'user' as const } : page,
  );
  return { ...document, content: { ...document.content, days } };
}

/** Moves a photo to a page with room. A full page needs `swapPhotos` instead. */
export function movePhoto(document: QuestDocument, photoId: string, toPageIndex: number): EditResult {
  const target = document.content.days[toPageIndex];
  if (!target) return { ok: false, reason: 'That page is gone.' };
  if (target.photoIds.length >= PHOTOS_PER_PAGE)
    return { ok: false, reason: 'That page is full. Tap one of its photos to swap.' };
  const days = document.content.days.map((page, index) => {
    const without = page.photoIds.filter((id) => id !== photoId);
    return { ...page, photoIds: index === toPageIndex ? [...without, photoId] : without };
  });
  return { ok: true, document: withPages(document, days) };
}

export function swapPhotos(document: QuestDocument, firstId: string, secondId: string): QuestDocument {
  const days = document.content.days.map((page) => ({
    ...page,
    photoIds: page.photoIds.map((id) => (id === firstId ? secondId : id === secondId ? firstId : id)),
  }));
  return withPages(document, days);
}

export function startNewPage(document: QuestDocument, photoId: string, newPageId: string): EditResult {
  if (document.content.days.length >= MAX_PAGES)
    return { ok: false, reason: `A Quest has at most ${MAX_PAGES} pages.` };
  const days = [
    ...document.content.days.map((page) => ({
      ...page,
      photoIds: page.photoIds.filter((id) => id !== photoId),
    })),
    { id: newPageId, titleSource: 'auto' as const, placeIds: [], photoIds: [photoId] },
  ];
  return { ok: true, document: withPages(document, days) };
}

export function removePhoto(document: QuestDocument, photoId: string): EditResult {
  if (photoCount(document) <= MIN_PHOTOS_TO_PUBLISH) return { ok: false, reason: NEED_THREE };
  const days = document.content.days.map((page) => ({
    ...page,
    photoIds: page.photoIds.filter((id) => id !== photoId),
  }));
  const photos = document.photos.filter((photo) => photo.id !== photoId);
  const coverPhotoId = document.coverPhotoId === photoId ? undefined : document.coverPhotoId;
  return { ok: true, document: withPages({ ...document, photos, coverPhotoId }, days) };
}

type NewPhoto = QuestDocument['photos'][number];

/** The new photo takes the old one's slot and keeps its caption; its own date wins if it has one (F-A6). */
export function replacePhoto(document: QuestDocument, oldId: string, photo: NewPhoto): QuestDocument {
  const old = document.photos.find((candidate) => candidate.id === oldId);
  const replacement: NewPhoto = {
    ...photo,
    caption: old?.caption,
    captionSource: old?.captionSource,
    date: photo.date ?? old?.date,
    placeId: photo.placeId ?? old?.placeId,
  };
  const photos = document.photos.map((candidate) => (candidate.id === oldId ? replacement : candidate));
  const days = document.content.days.map((page) => ({
    ...page,
    photoIds: page.photoIds.map((id) => (id === oldId ? photo.id : id)),
  }));
  const coverPhotoId = document.coverPhotoId === oldId ? photo.id : document.coverPhotoId;
  return withPages({ ...document, photos, coverPhotoId }, days);
}

/** New photos fill free slots from the last page, then new pages. Returns how many fitted. */
export function addPhotos(
  document: QuestDocument,
  added: NewPhoto[],
  createId: () => string,
  maxPhotos: number,
) {
  const room = Math.max(0, maxPhotos - photoCount(document));
  const fitting = added.slice(0, room);
  const days = document.content.days.map((page) => ({ ...page, photoIds: [...page.photoIds] }));
  for (const photo of fitting) {
    const last = days.at(-1);
    if (last && last.photoIds.length < PHOTOS_PER_PAGE) last.photoIds.push(photo.id);
    else days.push({ id: createId(), titleSource: 'auto', placeIds: [], photoIds: [photo.id] });
  }
  return {
    document: withPages({ ...document, photos: [...document.photos, ...fitting] }, days),
    added: fitting.length,
  };
}

export function setCaption(document: QuestDocument, photoId: string, caption: string): QuestDocument {
  const photos = document.photos.map((photo) =>
    photo.id === photoId
      ? { ...photo, caption: caption.trim() || undefined, captionSource: 'user' as const }
      : photo,
  );
  return { ...document, photos };
}

/** Changing a photo's date never moves it; its page's dates and auto title follow. */
export function setPhotoDate(
  document: QuestDocument,
  photoId: string,
  date: string | undefined,
): QuestDocument {
  const photos = document.photos.map((photo) => (photo.id === photoId ? { ...photo, date } : photo));
  return retitle({ ...document, photos });
}
