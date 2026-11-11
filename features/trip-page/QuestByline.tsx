'use client';

import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { FollowButton } from '@/features/profile/FollowButton';
import type { TripData } from '@/lib/trip/types';
import { useQuestSocial } from './useQuestSocial';

/**
 * Under the last page: who made this Quest, with Follow next to their name for signed-in people
 * who aren't the creator (screen 6). Signed out, Make your own is the one thing to do.
 */
export function QuestByline({ traveler }: { traveler: TripData['traveler'] }) {
  const { viewer, viewerKnown, ownerKey, path } = useQuestSocial();
  const canFollow = viewerKnown && viewer.signedIn && !viewer.isOwner;

  return (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/@${traveler.handle}`} className="flex min-h-11 min-w-0 items-center gap-3">
        <Avatar name={traveler.name} src={traveler.avatar?.thumb} size={40} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold text-ink">{traveler.name}</span>
          <span className="truncate text-label font-normal text-ink-muted">@{traveler.handle}</span>
        </span>
      </Link>
      {canFollow && ownerKey && (
        <FollowButton
          targetKey={ownerKey}
          following={viewer.followingOwner}
          signedIn
          returnPath={path}
          source="quest"
        />
      )}
    </div>
  );
}
