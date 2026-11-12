'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { setFollow } from './actions';

type Source = 'profile' | 'quest' | 'explore' | 'search' | 'followers_list';

type Props = {
  targetKey: string;
  following: boolean;
  signedIn: boolean;
  /** Where to come back to after signing in. */
  returnPath: string;
  source: Source;
  onChange?: (following: boolean, followerCount: number) => void;
  /** `small` beside a byline (the prototype's .btn.sm). */
  size?: 'regular' | 'small';
};

const SMALL = 'min-h-9 px-3.5 py-1.5 text-label';

/** Follow / Following (M22, M27). Tapping Following unfollows. Signed out it signs in first. */
export function FollowButton({
  targetKey,
  following: initial,
  signedIn,
  returnPath,
  source,
  onChange,
  size = 'regular',
}: Props) {
  const extra = size === 'small' ? SMALL : '';
  const [following, setFollowing] = useState(initial);
  const [saving, setSaving] = useState(false);

  if (!signedIn) {
    return (
      <Link
        href={`/login?${new URLSearchParams({ next: returnPath }).toString()}`}
        className={`${buttonClassName()} ${extra}`}
      >
        Follow
      </Link>
    );
  }

  async function toggle() {
    const wanted = !following;
    setFollowing(wanted);
    setSaving(true);
    const result = await setFollow({ targetKey, follow: wanted, source }).catch(() => null);
    setSaving(false);
    if (!result?.ok || !result.data.saved) return setFollowing(!wanted);
    setFollowing(result.data.following);
    onChange?.(result.data.following, result.data.followerCount);
  }

  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      className={extra}
      aria-pressed={following}
      disabled={saving}
      onClick={() => void toggle()}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
