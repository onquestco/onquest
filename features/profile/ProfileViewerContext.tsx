'use client';

import { createContext, useContext, type ReactNode } from 'react';
import Link from 'next/link';
import { SettingsIcon } from '@/design-system/components/icons';
import { TopBar } from '@/design-system/components/TopBar';
import { useProfileViewer, type ProfileViewer } from './useProfileViewer';

// One "who is looking" request per profile page, shared by the top bar and the header.
const ViewerContext = createContext<ProfileViewer | null>(null);

export function ProfileViewerProvider({ profileKey, children }: { profileKey: string; children: ReactNode }) {
  const viewer = useProfileViewer(profileKey);
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

/** null until the page knows who is looking. */
export function useViewer(): ProfileViewer | null {
  return useContext(ViewerContext);
}

/**
 * The prototype's bar: your own profile has @handle in the middle and the Settings gear; someone
 * else's has ‹ Back and @handle. The title isn't the page's h1 (the name below is).
 */
export function ProfileTopBar({ handle }: { handle: string }) {
  const viewer = useViewer();
  if (viewer?.isSelf)
    return (
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto grid max-w-lg grid-cols-3 items-center px-2 py-1">
          <span />
          <p className="truncate text-center text-body font-semibold text-ink">@{handle}</p>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex size-11 items-center justify-center justify-self-end text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>
    );
  return <TopBar title={`@${handle}`} titleAs="p" fallback="/explore" />;
}

/** Under your own Quests only: why drafts and private ones aren't here. */
export function OwnProfileNote() {
  const viewer = useViewer();
  if (!viewer?.isSelf) return null;
  return (
    <p className="text-label font-normal text-ink-muted">
      Only your public Quests show here. Drafts, unlisted and private Quests are on Home.
    </p>
  );
}
