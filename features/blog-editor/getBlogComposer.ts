import { z } from 'zod';
import type { InitialBlogDraft } from './blogDraftStore';
import type { Writer } from './BlogPreview';
import { getBlogDraft } from './getBlogDraft';
import { getMyQuestsForLinking } from './getMyQuestsForLinking';

/** What /blogs/[key]/edit needs: the writer's own draft and their Quests to link. Null if it isn't theirs. */
export async function getBlogComposer(key: string): Promise<{
  initial: InitialBlogDraft;
  writer: Writer;
  quests: Awaited<ReturnType<typeof getMyQuestsForLinking>>;
} | null> {
  // Not a blog key at all (a mistyped link): nothing to look up.
  if (!z.uuid().safeParse(key).success) return null;
  const [draft, quests] = await Promise.all([getBlogDraft(key), getMyQuestsForLinking()]);
  if (!draft) return null;
  return {
    initial: {
      key: draft.key,
      ownerKey: draft.ownerKey,
      photoFolder: draft.photoFolder,
      draftSavedAt: draft.draftSavedAt,
      blogSavedAt: draft.blogSavedAt,
      status: draft.status,
      published: draft.published,
      visibility: draft.visibility,
      document: draft.document,
    },
    writer: { handle: draft.ownerHandle, name: draft.ownerName ?? draft.ownerHandle },
    quests,
  };
}
