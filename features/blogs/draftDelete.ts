import { forgetNewBlogKey, removeLocalDraft, type LocalStorageLike } from '@/features/blog-editor/localDraft';
import type { ActionResult } from '@/lib/action';

// What "Delete draft" does with deleteBlogDraft's answer (blogs-editor spec §6.3), kept apart from
// the sheet so each outcome can be tested.

type DeleteResult = ActionResult<{ deleted: true } | { deleted: false; error: 'not_found' | 'published' }>;

/**
 * deleted: the row goes (also when it was already gone: there's nothing left to show).
 * posted: it was posted on another device meanwhile, so show the latest list.
 * failed: say so in the sheet; nothing changed.
 */
export function draftDeleteOutcome(result: DeleteResult | null): 'deleted' | 'posted' | 'failed' {
  if (!result?.ok) return 'failed';
  if (result.data.deleted) return 'deleted';
  return result.data.error === 'published' ? 'posted' : 'deleted';
}

/** After a delete: this device's saved copy must not come back on /blogs/new or the composer. */
export function forgetDeletedDraft(storage: LocalStorageLike | null, key: string, ownerKey: string): void {
  removeLocalDraft(storage, key);
  forgetNewBlogKey(storage, key, ownerKey);
}
