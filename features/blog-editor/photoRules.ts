import { BLOG_MAX_PHOTOS } from '@/lib/blog/limits';
import type { BlogPhoto } from '@/lib/blog/schema';
import type { PickedPhoto } from '@/features/editor/upload';

// The photo row's rules (PRD B3): up to 10, the first is the cover, drag to reorder.

export const PHOTO_LIMIT_MESSAGE = `A blog holds ${BLOG_MAX_PHOTOS} photos.`;

/**
 * Which picked files fit. `taken` counts the photos in the blog plus the ones still uploading or
 * failed (they hold a place until removed). Anything past 10 is refused with the message.
 */
export function addPhotos<Item>(taken: number, files: Item[]): { accepted: Item[]; refused: boolean } {
  const room = Math.max(0, BLOG_MAX_PHOTOS - taken);
  return { accepted: files.slice(0, room), refused: files.length > room };
}

/** Moves one photo to another place; moving to 0 makes it the cover. */
export function movePhoto(photos: BlogPhoto[], from: number, to: number): BlogPhoto[] {
  const target = Math.min(Math.max(to, 0), photos.length - 1);
  if (from === target || from < 0 || from >= photos.length) return photos;
  const next = [...photos];
  const [moved] = next.splice(from, 1);
  if (!moved) return photos;
  next.splice(target, 0, moved);
  return next;
}

export function removePhoto(photos: BlogPhoto[], photoId: string): BlogPhoto[] {
  return photos.filter((photo) => photo.id !== photoId);
}

/**
 * What the blog keeps of an uploaded photo: its id and size. The worker's GPS and capture time are
 * dropped here and never reach the store or any request (spec §7).
 */
export function toBlogPhoto(picked: Pick<PickedPhoto, 'id' | 'width' | 'height'>): BlogPhoto {
  return { id: picked.id, width: picked.width, height: picked.height };
}
