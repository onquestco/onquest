'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/design-system/components/Avatar';
import { buttonClassName } from '@/design-system/components/Button';
import { SettingsIcon } from '@/design-system/components/icons';
import { AppBottomBar } from '@/features/shell/AppBottomBar';
import { FollowButton } from './FollowButton';
import type { ProfileView } from './getProfile';
import { ProfileCover } from './ProfileCover';
import { useProfileViewer } from './useProfileViewer';

/**
 * The top of a profile (PRD screen 15). The page is cached for everyone, so the parts that depend
 * on who is looking come after load: your own profile gets the Settings gear, Edit profile and
 * the bottom bar; someone else's gets Follow. Everything else is in the server HTML.
 */
export function ProfileHeader({ profile }: { profile: ProfileView }) {
  const viewer = useProfileViewer(profile.key);
  const [followers, setFollowers] = useState(profile.stats.followers);
  const { handle } = profile;
  const counts = [
    { value: profile.stats.quests, label: profile.stats.quests === 1 ? 'Quest' : 'Quests' },
    { value: followers, label: followers === 1 ? 'Follower' : 'Followers', href: `/@${handle}/followers` },
    { value: profile.stats.following, label: 'Following', href: `/@${handle}/following` },
  ];

  return (
    <header className="flex flex-col gap-3">
      <div className="relative">
        <ProfileCover />
        {viewer?.isSelf && (
          <Link
            href="/settings"
            aria-label="Settings"
            className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-pill bg-surface text-ink"
          >
            <SettingsIcon />
          </Link>
        )}
        <span className="absolute -bottom-10 left-4 rounded-pill border-4 border-surface bg-surface">
          <Avatar name={profile.name} src={profile.avatarUrl} size={80} />
        </span>
      </div>

      <div className="mt-10 flex flex-col gap-1">
        <h1 className="text-title text-ink">{profile.name}</h1>
        <p className="text-label font-normal text-ink-muted">
          @{handle}
          {profile.homeCity && ` · ${profile.homeCity}`}
        </p>
      </div>
      {profile.bio && <p className="text-body whitespace-pre-line text-ink">{profile.bio}</p>}

      <ul className="grid grid-cols-3 rounded-lg border border-line text-center">
        {counts.map((count) => {
          const body = (
            <>
              <strong className="block text-lead text-ink">{count.value}</strong>
              <span className="text-caption text-ink-muted">{count.label}</span>
            </>
          );
          return (
            <li key={count.label}>
              {count.href ? (
                <Link href={count.href} className="flex min-h-11 flex-col justify-center py-2">
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-11 flex-col justify-center py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {viewer?.isSelf && (
        <Link href="/settings/profile" className={buttonClassName({ variant: 'secondary' })}>
          Edit profile
        </Link>
      )}
      {viewer && !viewer.isSelf && (
        <FollowButton
          targetKey={profile.key}
          following={viewer.following}
          signedIn={viewer.signedIn}
          returnPath={`/@${handle}`}
          source="profile"
          onChange={(_, count) => setFollowers(count)}
        />
      )}
      {viewer?.isSelf && <AppBottomBar handle={handle} />}
    </header>
  );
}
