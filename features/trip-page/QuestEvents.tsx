'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { track } from '@/lib/analytics/client';
import type { VIEW_EXIT_CODE } from '@/lib/analytics/codes';
import { MemorySheetCallbacks, type MemorySheetAction } from '@/templates/shared/MemorySheet';
import { QuestPlayerCallbacks, type PageTurn } from '@/templates/shared/QuestPlayer';
import {
  afterTurn,
  fullscreenProperties,
  isMakeYourOwnHref,
  pageTurnProperties,
  photoClickProperties,
  startReading,
  viewEndedProperties,
} from './questProperties';

// The real Quest page's reading events (spec analytics-v2 §6.2): page turns, full screen, the
// memory sheet, and quest_view_ended when the reader leaves. The template only reports what
// happened through its optional callbacks; everything sent is decided here. Not on /demo.

type Exit = keyof typeof VIEW_EXIT_CODE;

type QuestPageEvents = { fullscreen: (on: boolean, via: 'button' | 'escape') => void };

const EventsContext = createContext<QuestPageEvents | null>(null);

/** The page's events, or null where none are sent (/demo). */
export function useQuestPageEvents(): QuestPageEvents | null {
  return useContext(EventsContext);
}

/** Visible time only: the clock stops while the tab is hidden. */
function visibleClock() {
  let total = 0;
  let since: number | null = document.visibilityState === 'visible' ? performance.now() : null;
  return {
    pause() {
      if (since !== null) total += performance.now() - since;
      since = null;
    },
    resume() {
      since ??= performance.now();
    },
    elapsed: () => total + (since === null ? 0 : performance.now() - since),
  };
}

type Props = { questKey: string; path: string; totalPages: number; children: ReactNode };

export function QuestEvents({ questKey, path, totalPages, children }: Props) {
  const reading = useRef(startReading(totalPages));

  const onPageChange = useCallback(
    (turn: PageTurn) => {
      reading.current = afterTurn(reading.current, turn);
      track('quest_page_turn', pageTurnProperties(questKey, turn));
    },
    [questKey],
  );

  const onAction = useCallback(
    (action: MemorySheetAction) =>
      track('quest_photo_click', photoClickProperties(questKey, action, reading.current.page)),
    [questKey],
  );

  const events = useMemo<QuestPageEvents>(
    () => ({ fullscreen: (on, via) => track('quest_fullscreen', fullscreenProperties(questKey, on, via)) }),
    [questKey],
  );

  // quest_view_ended, once per view: tab hidden or closed, Back, or any other way out in the app.
  useEffect(() => {
    const clock = visibleClock();
    let ended = false;
    let exit: Exit = 'in_app';

    const end = (how: Exit) => {
      if (ended) return;
      ended = true;
      track('quest_view_ended', viewEndedProperties(questKey, reading.current, clock.elapsed(), how));
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return clock.resume();
      clock.pause();
      end('hidden');
    };
    const onPageHide = () => end('hidden');
    // Back (or Forward) to another page; a #comments jump on this page doesn't count.
    const onPopState = () => {
      if (window.location.pathname.toLowerCase() !== path.toLowerCase()) exit = 'back';
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a[href]');
      if (link && isMakeYourOwnHref(link.getAttribute('href') ?? '', window.location.origin)) {
        exit = 'make_your_own';
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick, true);
      // Unmounting is leaving in the app (React's dev double mount ends a zero-second view).
      end(exit);
    };
  }, [questKey, path]);

  return (
    <EventsContext.Provider value={events}>
      <QuestPlayerCallbacks onPageChange={onPageChange}>
        <MemorySheetCallbacks onAction={onAction}>{children}</MemorySheetCallbacks>
      </QuestPlayerCallbacks>
    </EventsContext.Provider>
  );
}
