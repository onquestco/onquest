import type { Photo } from '@/lib/trip/types';

export type Shape = 'tall' | 'wide' | 'any';

const fitsShape = (photo: Photo, shape: Shape) => {
  if (shape === 'any') return true;
  const isTall = photo.height >= photo.width;
  return shape === 'tall' ? isTall : !isTall;
};

/**
 * Picks the next photo for a slot from `pool` (in order of preference).
 * Prefers photos of the requested shape, skips photos already used on the page,
 * and marks the chosen photo as used. Returns undefined when nothing is left.
 */
export function pickPhoto(pool: Photo[], shape: Shape, used: Set<string>): Photo | undefined {
  const unused = pool.filter((photo) => !used.has(photo.id));
  const choice = unused.find((photo) => fitsShape(photo, shape)) ?? unused[0];
  if (choice) used.add(choice.id);
  return choice;
}

/** Removes duplicate photos (by id), keeping the first occurrence. */
export function uniquePhotos(photos: (Photo | undefined)[]): Photo[] {
  const seen = new Set<string>();
  return photos.filter((photo): photo is Photo => {
    if (!photo || seen.has(photo.id)) return false;
    seen.add(photo.id);
    return true;
  });
}
