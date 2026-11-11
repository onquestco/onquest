'use client';

import { createContext, useContext, type ReactNode } from 'react';
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

/** ‹ Back and @handle on someone else's profile (the prototype's bar); yours has the tabs instead. */
export function ProfileTopBar({ handle }: { handle: string }) {
  const viewer = useViewer();
  if (!viewer || viewer.isSelf) return null;
  return <TopBar title={`@${handle}`} fallback="/explore" />;
}
