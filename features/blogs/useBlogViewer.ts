'use client';

import { useCallback, useEffect, useState } from 'react';
import { BlogViewerSchema, type BlogViewer } from '@/lib/social/schema';

const SIGNED_OUT: BlogViewer = {
  signedIn: false,
  liked: false,
  isOwner: false,
  followingOwner: false,
  linkedQuestHidden: false,
};

/**
 * Who is reading this blog: signed in, liked, the writer (and, for the writer, the ⋯ menu's token
 * and the linked-Quest note). Asked after the cached page loads, from a route that is never cached
 * (spec §3.10). null until it answers; signed out if it fails. `reload` asks again (after a
 * conflict in the ⋯ menu).
 */
export function useBlogViewer(blogKey: string, ownerKey?: string) {
  const [viewer, setViewer] = useState<BlogViewer | null>(null);
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const query = ownerKey ? `?${new URLSearchParams({ owner: ownerKey }).toString()}` : '';
    fetch(`/api/blogs/${blogKey}/me${query}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((body: unknown) => {
        const parsed = BlogViewerSchema.safeParse(body);
        setViewer(parsed.success ? parsed.data : SIGNED_OUT);
      })
      .catch(() => {
        if (!controller.signal.aborted) setViewer(SIGNED_OUT);
      });
    return () => controller.abort();
  }, [blogKey, ownerKey, asked]);

  const reload = useCallback(() => setAsked((count) => count + 1), []);
  return { viewer, reload };
}
