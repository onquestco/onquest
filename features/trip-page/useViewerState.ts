'use client';

import { useEffect, useState } from 'react';
import { ViewerStateSchema, type ViewerState } from '@/lib/social/schema';

const SIGNED_OUT: ViewerState = { signedIn: false, liked: false, isOwner: false, followingOwner: false };

/**
 * Who is looking at this Quest: signed in, liked, owner. Asked after the cached page loads, from a
 * route that is never cached (spec B §3.2). null until it answers; signed out if it fails.
 */
export function useViewerState(tripKey: string, ownerKey?: string): ViewerState | null {
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = ownerKey ? `?${new URLSearchParams({ owner: ownerKey }).toString()}` : '';
    fetch(`/api/quests/${tripKey}/me${query}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((body: unknown) => {
        const parsed = ViewerStateSchema.safeParse(body);
        setViewer(parsed.success ? parsed.data : SIGNED_OUT);
      })
      .catch(() => {
        if (!controller.signal.aborted) setViewer(SIGNED_OUT);
      });
    return () => controller.abort();
  }, [tripKey, ownerKey]);

  return viewer;
}
