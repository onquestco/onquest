'use client';

import Link from 'next/link';
import { HeartIcon } from '@/design-system/components/icons';
import { likeLabel } from './likeCopy';
import { signInPath, type LikeSource } from './socialActions';
import { useQuestSocial } from './useQuestSocial';

const look =
  'inline-flex min-h-11 items-center gap-2 rounded-pill border border-line-control bg-surface px-4 text-label font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand-strong';

/** Signed out, the heart is a sign-in link that comes back here and counts the like (M10). */
export function LikeButton({ source }: { source: LikeSource }) {
  const { viewer, liked, likeCount, toggleLike, path, tripKey } = useQuestSocial();
  const label = likeLabel(likeCount, liked);
  const heart = (
    <span className={liked ? 'text-brand-strong' : ''}>
      <HeartIcon size={20} filled={liked} />
    </span>
  );

  if (!viewer.signedIn) {
    return (
      <Link
        href={signInPath('like', path, tripKey)}
        className={look}
        aria-label={`Like this Quest. ${label}`}
      >
        {heart}
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className={look} aria-pressed={liked} onClick={() => toggleLike(source)}>
      {heart}
      {label}
    </button>
  );
}
