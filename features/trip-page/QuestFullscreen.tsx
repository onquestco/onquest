'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon, ExpandIcon } from '@/design-system/components/icons';
import { useQuestPlayer } from '@/templates/shared/QuestPlayer';
import { LikeButton } from './LikeButton';
import { useQuestPageEvents } from './QuestEvents';

const round =
  'flex size-11 items-center justify-center rounded-pill bg-surface text-ink shadow-float focus-visible:outline-2 focus-visible:outline-brand-strong';

/** The full-screen button (bottom right of the Quest) and, in full screen, counter, close and like (M9). */
export function QuestFullscreen({ withLike }: { withLike: boolean }) {
  const { page, count, fullscreen, setFullscreen } = useQuestPlayer();
  const events = useQuestPageEvents();
  const wasFullscreen = useRef(fullscreen);
  const closedByButton = useRef(false);

  // Leaving full screen without our button is Escape (ours, or the browser's own full screen).
  useEffect(() => {
    if (wasFullscreen.current && !fullscreen && !closedByButton.current) events?.fullscreen(false, 'escape');
    wasFullscreen.current = fullscreen;
    closedByButton.current = false;
  }, [fullscreen, events]);

  function toggle(on: boolean) {
    closedByButton.current = !on;
    events?.fullscreen(on, 'button');
    setFullscreen(on);
  }

  if (!fullscreen) {
    return (
      <div className="absolute right-4 bottom-4">
        <button type="button" className={round} aria-label="Full screen" onClick={() => toggle(true)}>
          <ExpandIcon size={20} />
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="fixed inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
        <span
          className="rounded-pill bg-night-band/60 px-3 py-1 text-label font-semibold text-on-night"
          aria-live="polite"
        >
          {page + 1} / {count}
        </span>
        <button type="button" className={round} aria-label="Close full screen" onClick={() => toggle(false)}>
          <CloseIcon size={20} />
        </button>
      </div>
      {withLike && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center">
          <LikeButton source="fullscreen" />
        </div>
      )}
    </>
  );
}
