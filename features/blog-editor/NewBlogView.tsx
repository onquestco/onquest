'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createStartedProperties } from '@/features/blogs/blogEvents';
import type { BlogCreateSource } from '@/features/shell/CreateChooser';
import { track } from '@/lib/analytics/client';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';
import { BlogComposer } from './BlogComposer';
import type { InitialBlogDraft } from './blogDraftStore';
import type { Writer } from './BlogPreview';
import { browserStorage, startNewBlog } from './localDraft';

const EDIT_PATH = /^\/blogs\/[0-9a-f-]{36}\/edit$/i;

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
 * instead of starting another (oq_blog_draft:new), and doesn't count as a new start. Only this
 * account's: another account's unsent blog on a shared phone is removed, never resumed.
 */
export function NewBlogView({ userId, source, defaultVisibility, quests, writer }: Props) {
  const router = useRouter();
  const [initial, setInitial] = useState<InitialBlogDraft>();

  useEffect(() => {
    // After the first save this page's address became /blogs/{key}/edit (useBlogAutosave). Coming
    // back to that history entry (Back from the Quest flow or the share screen) can restore this
    // page: open the saved draft, never a new empty one.
    const savedPath = window.location.pathname;
    if (EDIT_PATH.test(savedPath)) {
      router.replace(savedPath);
      return;
    }
    const start = startNewBlog(browserStorage(), userId, () => crypto.randomUUID());
    if (start.kind === 'saved') {
      router.replace(`/blogs/${start.key}/edit`);
      return;
    }
    if (start.kind === 'new') track('blog_create_started', createStartedProperties(start.key, source));
    // The key and any unsent draft exist only in this browser, so they're read once after load.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of browser storage
    setInitial({
      key: start.key,
      ownerKey: userId,
      photoFolder: `${userId}/${start.key}`,
      draftSavedAt: null,
      blogSavedAt: null,
      status: 'draft',
      visibility: defaultVisibility,
      document: start.kind === 'resumed' ? start.document : { body: '', photos: [] },
    });
  }, [router, userId, source, defaultVisibility]);

  // Nothing to draw until the key exists (the same on the server and the first browser render).
  if (!initial) return <main className="min-h-svh bg-surface" aria-busy />;
  return <BlogComposer initial={initial} quests={quests} writer={writer} />;
}
