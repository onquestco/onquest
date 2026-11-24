import { z } from 'zod';
import { getBlogDraft } from './getBlogDraft';

/** The share screen's link: the writer's own posted blog. Null if it isn't theirs or isn't posted. */
export async function getBlogShare(key: string) {
  if (!z.uuid().safeParse(key).success) return null;
  const draft = await getBlogDraft(key);
  if (!draft?.published) return null;
  return {
    title: draft.document.title?.trim() || 'Blog',
    path: draft.published.path,
    visibility: draft.published.visibility,
  };
}
