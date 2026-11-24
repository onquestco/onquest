'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { publishBlog } from '@/features/blogs/actions';
import type { Visibility } from '@/lib/trip/schema';
import type { BlogDraftSaver } from './blogDraftSaver';
import type { BlogDraftStore } from './blogDraftStore';
import { browserStorage, removeLocalDraft } from './localDraft';
import { POST_EMPTY_MESSAGE } from './postRules';

// Post (spec §3.10): save what's on screen first, so what's posted is exactly that, then publish.
// The first Post chooses who sees it; later Posts keep it and go live straight away.

export const CONFLICT_MESSAGE = 'This draft was changed somewhere else. Reload.';
const LOST_MESSAGE = "This blog isn't here any more.";
const FAILED_MESSAGE = "Couldn't post. Check your connection and try again.";

const ERRORS: Record<string, string> = {
  conflict: CONFLICT_MESSAGE,
  empty: POST_EMPTY_MESSAGE,
  not_found: LOST_MESSAGE,
  invalid_visibility: FAILED_MESSAGE,
};

export function usePostBlog(store: BlogDraftStore, saver: BlogDraftSaver) {
  const router = useRouter();
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string>();

  function fail(message: string) {
    setPosting(false);
    setError(message);
  }

  /** `visibility` on the first Post; null keeps the current one. */
  async function post(visibility: Visibility | null) {
    setPosting(true);
    setError(undefined);
    const saved = await saver.saveNow({ force: store.getState().draftSavedAt === null });
    if (saved === 'conflict') return fail(CONFLICT_MESSAGE);
    if (saved === 'not_found') return fail(LOST_MESSAGE);
    if (saved === 'offline' || saved === 'failed' || saved === 'exists' || saved === 'no_access') {
      return fail(FAILED_MESSAGE);
    }

    const { key, draftSavedAt, blogSavedAt } = store.getState();
    if (!draftSavedAt || !blogSavedAt) return fail(FAILED_MESSAGE);
    const result = await publishBlog({ key, basedOnDraft: draftSavedAt, basedOnBlog: blogSavedAt, visibility }).catch(
      () => null,
    );
    if (!result?.ok) return fail(FAILED_MESSAGE);
    if (!result.data.published) return fail(ERRORS[result.data.error] ?? FAILED_MESSAGE);

    const chosen = visibility ?? store.getState().visibility;
    store.getState().setPublished({ slug: result.data.slug, path: result.data.path, visibility: chosen }, result.data.savedAt);
    removeLocalDraft(browserStorage(), key);
    // An update goes live at once and lands on the blog with "Blog updated." (spec §6.1). The
    // writer's own view shows it whatever its visibility, and is never cached.
    router.push(result.data.firstPublish ? `/blogs/${key}/share` : `/blogs/${key}?updated=1`);
  }

  return { post, posting, error, clearError: () => setError(undefined) };
}
