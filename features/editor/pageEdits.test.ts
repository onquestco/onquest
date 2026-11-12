import { describe, expect, it } from 'vitest';
import type { QuestDocument } from '@/lib/trip/schema';
import {
  addPhotos,
  movePhoto,
  NEED_THREE,
  removePhoto,
  renamePage,
  replacePhoto,
  setCaption,
  setPhotoDate,
  startNewPage,
  swapPhotos,
} from './pageEdits';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let next = 100;
const createId = () => id(next++);

function documentWith(pages: number[][], dates: Record<number, string> = {}): QuestDocument {
  const photoNumbers = pages.flat();
  return {
    templateId: 'beach',
    content: {
      favourites: [],
      days: pages.map((photos, index) => ({
        id: id(50 + index),
        title: `Page ${index + 1}`,
        titleSource: 'auto',
        placeIds: [],
        photoIds: photos.map(id),
      })),
    },
    photos: photoNumbers.map((n) => ({ id: id(n), width: 4, height: 3, date: dates[n] })),
    places: [],
  };
}
const shape = (document: QuestDocument) =>
  document.content.days.map((page) => page.photoIds.map((photoId) => Number(photoId.slice(-3))));

describe('Review pages edits', () => {
  it('keeps "Page N" titles on a one-day Quest after a move, instead of "Day 1" twice', () => {
    const sameDay = { 1: '2026-10-02', 2: '2026-10-02', 3: '2026-10-02', 4: '2026-10-02', 5: '2026-10-02' };
    const result = movePhoto(
      documentWith(
        [
          [1, 2, 3],
          [4, 5],
        ],
        sameDay,
      ),
      id(1),
      1,
    );
    expect(result.ok && result.document.content.days.map((page) => page.title)).toEqual(['Page 1', 'Page 2']);
  });

  it('moves a photo to a page with room (M5)', () => {
    const result = movePhoto(
      documentWith([
        [1, 2, 3],
        [4, 5],
      ]),
      id(3),
      1,
    );
    expect(result.ok && shape(result.document)).toEqual([
      [1, 2],
      [4, 5, 3],
    ]);
  });

  it('refuses to move onto a full page, and swaps instead (M5)', () => {
    const document = documentWith([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(movePhoto(document, id(3), 1).ok).toBe(false);
    expect(shape(swapPhotos(document, id(3), id(4)))).toEqual([
      [1, 2, 4],
      [3, 5, 6],
    ]);
  });

  it('keeps at least 3 photos (M5)', () => {
    const result = removePhoto(documentWith([[1, 2, 3]]), id(1));
    expect(result).toEqual({ ok: false, reason: NEED_THREE });
  });

  it('drops a page left empty', () => {
    const result = removePhoto(documentWith([[1, 2, 3], [4]]), id(4));
    expect(result.ok && shape(result.document)).toEqual([[1, 2, 3]]);
  });

  it('starts a new page only while there are fewer than 5', () => {
    const four = startNewPage(documentWith([[1, 2, 3], [4], [5], [6]]), id(3), createId());
    expect(four.ok && shape(four.document)).toEqual([[1, 2], [4], [5], [6], [3]]);
    expect(startNewPage(documentWith([[1, 2], [3], [4], [5], [6]]), id(1), createId()).ok).toBe(false);
  });

  it('replaces a photo in the same slot, keeping its caption (M5, F-A6)', () => {
    const document = setCaption(documentWith([[1, 2, 3]]), id(2), 'Sunset');
    const replaced = replacePhoto(document, id(2), { id: id(9), width: 4, height: 3 });
    expect(shape(replaced)).toEqual([[1, 9, 3]]);
    expect(replaced.photos.find((photo) => photo.id === id(9))?.caption).toBe('Sunset');
  });

  it('adds photos to free slots, then new pages, up to the limit', () => {
    const { document, added } = addPhotos(
      documentWith([[1, 2]]),
      [9, 10, 11].map((n) => ({ id: id(n), width: 4, height: 3 })),
      createId,
      4,
    );
    expect(added).toBe(2);
    expect(shape(document)).toEqual([[1, 2, 9], [10]]);
  });

  it('keeps a renamed page title (M5)', () => {
    const renamed = renamePage(documentWith([[1, 2, 3], [4]]), 1, 'Beach day');
    const moved = movePhoto(renamed, id(3), 1);
    expect(moved.ok && moved.document.content.days[1]?.title).toBe('Beach day');
  });

  it("doesn't move a photo when its date changes, but its page's dates follow (M5)", () => {
    const document = setPhotoDate(documentWith([[1, 2, 3]], { 1: '2026-10-17' }), id(2), '2026-10-18');
    expect(shape(document)).toEqual([[1, 2, 3]]);
    expect(document.content.days[0]).toMatchObject({
      startDate: '2026-10-17',
      endDate: '2026-10-18',
      title: 'Days 1–2',
    });
  });
});
