'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { FollowButton } from './FollowButton';
import { useProfileViewer } from './useProfileViewer';

type Props = { profileKey: string; handle: string; followers: number };

/**
 * The part of a cached profile that depends on who is looking: Edit profile and Settings on your
 * own, Follow on someone else's, and the follower count that a follow changes.
 */
export function ProfileActions({ profileKey, handle, followers: initial }: Props) {
  const viewer = useProfileViewer(profileKey);
  const [followers, setFollowers] = useState(initial);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-ink-muted">
        <Link href={`/@${handle}/followers`} className="text-ink">
          <strong>{followers}</strong> {followers === 1 ? 'follower' : 'followers'}
        </Link>
      </p>
      {viewer?.isSelf && (
        <div className="flex gap-2">
          <Link href="/settings/profile" className={buttonClassName({ variant: 'secondary' })}>
            Edit profile
          </Link>
          <Link href="/settings" className={buttonClassName({ variant: 'quiet' })}>
            Settings
          </Link>
        </div>
      )}
      {viewer && !viewer.isSelf && (
        <FollowButton
          targetKey={profileKey}
          following={viewer.following}
          signedIn={viewer.signedIn}
          returnPath={`/@${handle}`}
          source="profile"
          onChange={(_, count) => setFollowers(count)}
        />
      )}
    </div>
  );
}
