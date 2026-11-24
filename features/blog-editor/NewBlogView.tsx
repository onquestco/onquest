'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BlogCreateSource } from '@/features/shell/CreateChooser';
import { track } from '@/lib/analytics/client';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';
import { BlogComposer } from './BlogComposer';
import type { InitialBlogDraft } from './blogDraftStore';
import type { Writer } from './BlogPreview';
import { browserStorage, readLocalDraft, readNewBlogKey } from './localDraft';

type Props = {
  userId: string;
  source: BlogCreateSource;
  /** Settings "New Quests start as": the Post sheet's first choice. */
  defaultVisibility: Visibility;
  quests: QuestCard[];
  writer: Writer;
};

/**
 * /blogs/new. The blog's key is made here, in the browser, so photos can upload before the first
 * save (spec §3.1). A blog started offline that never reached the server is picked up again
 * instead of starting another (oq_blog_draft:new), and doesn't count as a new start.
 */
export function NewBlogView({ userId, source, defaultVisibility, quests, writer }: Props) {
  const router = useRouter();
  const [initial, setInitial] = useState<InitialBlogDraft>();

  useEffect(() => {
    const storage = browserStorage();
    const unsentKey = readNewBlogKey(storage);
    const unsent = unsentKey ? readLocalDraft(storage, unsentKey) : null;
    if (unsentKey && unsent?.basedOn) {
      // It did reach the server after all: open it there.
      router.replace(`/blogs/${unsentKey}/edit`);
      return;
    }
    const key = unsentKey && unsent ? unsentKey : crypto.randomUUID();
    if (!unsent) track('blog_create_started', { blog_id: key, source });
    // The key and any unsent draft exist only in this browser, so they're read once after load.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of browser storage
    setInitial({
      key,
      photoFolder: `${userId}/${key}`,
      draftSavedAt: null,
      blogSavedAt: null,
      status: 'draft',
      visibility: defaultVisibility,
      document: unsent?.document ?? { body: '', photos: [] },
    });
  }, [router, userId, source, defaultVisibility]);

  // Nothing to draw until the key exists (the same on the server and the first browser render).
  if (!initial) return <main className="min-h-svh bg-surface" aria-busy />;
  return <BlogComposer initial={initial} quests={quests} writer={writer} />;
}
