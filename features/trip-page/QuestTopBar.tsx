'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackIcon, MoreIcon } from '@/design-system/components/icons';
import { useQuestSocial } from './useQuestSocial';

const round =
  'flex size-11 items-center justify-center rounded-pill bg-surface text-ink shadow-float focus-visible:outline-2 focus-visible:outline-brand-strong';

/**
 * Over the top of the Quest, for signed-in people moving around the app (screen 6, screen 19):
 * Back, and ⋯ Manage on your own Quest. A friend opening a shared link sees neither.
 */
export function QuestTopBar() {
  const router = useRouter();
  const { viewer, tripKey } = useQuestSocial();
  if (!viewer.signedIn) return null;

  function back() {
    // Opened from a shared link in a fresh tab there is nothing to go back to: go Home instead.
    if (window.history.length > 1) router.back();
    else router.push('/home');
  }

  return (
    // Zero height: it floats over the Quest instead of pushing it down.
    <div className="pointer-events-none sticky top-0 z-30 h-0">
      <div className="flex items-center justify-between px-4 pt-3">
        <button type="button" className={`${round} pointer-events-auto`} aria-label="Back" onClick={back}>
          <BackIcon size={20} />
        </button>
        {viewer.isOwner && (
          <Link
            href={`/quests?${new URLSearchParams({ manage: tripKey }).toString()}`}
            className={`${round} pointer-events-auto`}
            aria-label="Manage this Quest"
          >
            <MoreIcon size={20} />
          </Link>
        )}
      </div>
    </div>
  );
}
