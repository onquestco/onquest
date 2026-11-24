import { describe, expect, it } from 'vitest';
import { addPhotos, movePhoto, PHOTO_LIMIT_MESSAGE, removePhoto, toBlogPhoto } from './photoRules';

const photo = (n: number) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, width: 1600, height: 1200 });

describe('blog photo rules', () => {
  it('refuses an 11th photo with "A blog holds 10 photos."', () => {
    expect(addPhotos(10, ['eleventh'])).toEqual({ accepted: [], refused: true });
    expect(PHOTO_LIMIT_MESSAGE).toBe('A blog holds 10 photos.');
  });

  it('takes only what fits when several are picked at once', () => {
    expect(addPhotos(8, ['a', 'b', 'c'])).toEqual({ accepted: ['a', 'b'], refused: true });
    expect(addPhotos(0, ['a', 'b'])).toEqual({ accepted: ['a', 'b'], refused: false });
  });

  it('dragging the third photo to the front makes it the cover', () => {
    const photos = [photo(1), photo(2), photo(3), photo(4)];
    const moved = movePhoto(photos, 2, 0);
    expect(moved.map((item) => item.id)).toEqual([photo(3).id, photo(1).id, photo(2).id, photo(4).id]);
    expect(moved[0]).toEqual(photo(3));
    expect(photos[0]).toEqual(photo(1)); // the original list is untouched
  });

  it('moves left and right one place, and stays inside the list', () => {
    const photos = [photo(1), photo(2), photo(3)];
    expect(movePhoto(photos, 0, 1).map((item) => item.id)).toEqual([photo(2).id, photo(1).id, photo(3).id]);
    expect(movePhoto(photos, 2, 9).map((item) => item.id)).toEqual(photos.map((item) => item.id));
    expect(movePhoto(photos, 0, -1)).toBe(photos);
  });

  it('removes a photo', () => {
    expect(removePhoto([photo(1), photo(2)], photo(1).id)).toEqual([photo(2)]);
  });

  it('keeps only the id and size of an uploaded photo: never its GPS', () => {
    const picked = { ...photo(1), takenAt: '2026-02-12T09:00:00.000Z', gps: { lat: 15.49, lng: 73.82 } };
    const kept = toBlogPhoto(picked);
    expect(kept).toEqual(photo(1));
    expect(JSON.stringify(kept)).not.toMatch(/lat|lng|gps|takenAt/);
  });
});
