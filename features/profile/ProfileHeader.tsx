'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/design-system/components/Avatar';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { AppBottomBar } from '@/features/shell/AppBottomBar';
import { FollowButton } from './FollowButton';
import type { ProfileView } from './getProfile';
import { ProfileCover } from './ProfileCover';
import { useViewer } from './ProfileViewerContext';

/**
 * The top of a profile (PRD screen 15, laid out like the prototype). The page is cached for
 * everyone, so the parts that depend on who is looking come after load: your own profile gets
 * Edit and Share and the bottom bar; someone else's gets Follow. Everything else is in the HTML.
 */
export function ProfileHeader({ profile }: { profile: ProfileView }) {
  const viewer = useViewer();
  const [followers, setFollowers] = useState(profile.stats.followers);
  const [shared, setShared] = useState(false);
  const { handle } = profile;

  async function shareProfile() {
    const url = `${window.location.origin}/@${handle}`;
    try {
      if (navigator.share) await navigator.share({ title: profile.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      // Closing the share sheet throws; nothing to do.
    }
  }

  const counts = [
    { value: profile.stats.quests, label: profile.stats.quests === 1 ? 'Quest' : 'Quests' },
    { value: followers, label: followers === 1 ? 'Follower' : 'Followers', href: `/@${handle}/followers` },
    { value: profile.stats.following, label: 'Following', href: `/@${handle}/following` },
  ];

  return (
    <header className="flex flex-col">
      <ProfileCover />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4">
        <div className="-mt-13 flex items-end justify-between">
          <span className="rounded-pill border-4 border-surface bg-surface">
            <Avatar name={profile.name} src={profile.avatarUrl} size={88} />
          </span>
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
        </div>

        <div>
          <h1 className="text-title text-ink">{profile.name}</h1>
          <p className="text-body text-ink-muted">
            @{handle}
            {profile.homeCity && ` · ${profile.homeCity}`}
          </p>
          {profile.bio && <p className="mt-1.5 text-body whitespace-pre-line text-ink">{profile.bio}</p>}
        </div>

        {viewer?.isSelf && (
          <div className="flex gap-2">
            <Link
              href="/settings/profile"
              className={`${buttonClassName({ variant: 'secondary' })} min-h-9 flex-1 px-3.5 py-1.5 text-label`}
            >
              Edit profile
            </Link>
            <Button
              variant="secondary"
              className="min-h-9 flex-1 px-3.5 py-1.5 text-label"
              onClick={() => void shareProfile()}
            >
              {shared ? 'Link copied' : 'Share profile'}
            </Button>
          </div>
        )}

        <ul className="grid grid-cols-3 rounded-md border border-line text-center">
          {counts.map((count, index) => {
            const body = (
              <>
                <strong className="block text-title text-ink tabular-nums">{count.value}</strong>
                <span className="text-caption text-ink-muted">{count.label}</span>
              </>
            );
            const look = `flex min-h-11 flex-col items-center justify-center py-2.5 ${index > 0 ? 'border-l border-line' : ''}`;
            return (
              <li key={count.label}>
                {count.href ? (
                  <Link href={count.href} className={look}>
                    {body}
                  </Link>
                ) : (
                  <div className={look}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {viewer?.isSelf && <AppBottomBar handle={handle} />}
    </header>
  );
}
