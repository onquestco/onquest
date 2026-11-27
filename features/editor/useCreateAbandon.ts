'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/client';
import { createAbandonedProperties, createStepForPath, type Abandoned } from './createFlowLaterProperties';

// quest_create_abandoned (analytics v2 §6.2): once per create-flow screen, when the tab is hidden
// or closed (sent as a beacon by client.ts), or when the screen is left for a page outside the
// create flow (Cancel, a back arrow, a tab). Moving between create screens isn't leaving.

/** The Who can see it sheet is open on Preview: leaving now is step 5. */
let publishSheetOpen = false;
export function setPublishSheetOpen(open: boolean) {
  publishSheetOpen = open;
}

/** What to send at the moment of leaving, or null when nothing should be (published, editing a live Quest). */
export type AbandonSnapshot = Omit<Abandoned, 'step' | 'now'> | null;

export function useCreateAbandon(read: () => AbandonSnapshot) {
  // The step is the screen's own, from the path it opened on: by the time it unmounts, the
  // address bar already shows the next page.
  const pathname = usePathname();
  const readLatest = useRef(read);
  useEffect(() => {
    readLatest.current = read;
  });

  useEffect(() => {
    let sent = false;
    const send = () => {
      if (sent) return;
      const step = createStepForPath(pathname, publishSheetOpen);
      const snapshot = readLatest.current();
      if (!step || !snapshot) return;
      sent = true;
      track('quest_create_abandoned', createAbandonedProperties({ ...snapshot, step, now: new Date() }));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') send();
    };
    window.addEventListener('pagehide', send);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', send);
      document.removeEventListener('visibilitychange', onVisibility);
      // After the navigation commits, the address bar shows where the person went.
      setTimeout(() => {
        if (createStepForPath(window.location.pathname, false) === undefined) send();
      }, 0);
    };
  }, [pathname]);
}
