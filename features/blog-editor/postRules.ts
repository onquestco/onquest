import type { BlogDocument } from '@/lib/blog/schema';

// When Post works (PRD B2, edge cases): a title and either some text or a photo, and no photo
// still uploading or failed. publish_blog refuses an empty blog too; this is the friendly check.

export const POST_EMPTY_MESSAGE = 'Add a title and some text or a photo.';

export type PendingPhotoState = { state: 'uploading' | 'failed' };

export type PostCheck =
  | { ok: true }
  /** Tapping Post says POST_EMPTY_MESSAGE. */
  | { ok: false; reason: 'empty' }
  /** Post is greyed out with a progress ring until every photo is up. */
  | { ok: false; reason: 'uploading' }
  /** A photo failed: Post waits until it's retried or removed. */
  | { ok: false; reason: 'photo_failed' };

export function canPost(document: BlogDocument, pending: PendingPhotoState[]): PostCheck {
  if (pending.some((photo) => photo.state === 'uploading')) return { ok: false, reason: 'uploading' };
  if (pending.some((photo) => photo.state === 'failed')) return { ok: false, reason: 'photo_failed' };
  const hasTitle = (document.title ?? '').trim() !== '';
  const hasStory = document.body.trim() !== '' || document.photos.length > 0;
  return hasTitle && hasStory ? { ok: true } : { ok: false, reason: 'empty' };
}

/** Anything worth keeping: the first save that has content creates the blog's rows. */
export function hasContent(document: BlogDocument): boolean {
  return (
    (document.title ?? '').trim() !== '' ||
    document.body.trim() !== '' ||
    document.photos.length > 0 ||
    document.place !== undefined ||
    document.linkedQuestKey !== undefined
  );
}
