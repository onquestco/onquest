'use client';

import { CloseIcon, ExpandIcon } from '@/design-system/components/icons';
import { useQuestPlayer } from '@/templates/shared/QuestPlayer';
import { LikeButton } from './LikeButton';

const round =
  'flex size-11 items-center justify-center rounded-pill bg-surface text-ink border border-line focus-visible:outline-2 focus-visible:outline-brand-strong';

/** The full-screen button (bottom right of the Quest) and, in full screen, counter, close and like (M9). */
export function QuestFullscreen({ withLike }: { withLike: boolean }) {
  const { page, count, fullscreen, setFullscreen } = useQuestPlayer();

  if (!fullscreen) {
    return (
      <div className="absolute right-4 bottom-4">
        <button type="button" className={round} aria-label="Full screen" onClick={() => setFullscreen(true)}>
          <ExpandIcon size={20} />
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="fixed inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
        <span className="rounded-pill bg-surface px-3 py-1 text-label text-ink border border-line" aria-live="polite">
          {page + 1} / {count}
        </span>
        <button type="button" className={round} aria-label="Close full screen" onClick={() => setFullscreen(false)}>
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
