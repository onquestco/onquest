'use client';

import Link from 'next/link';
import { HeartIcon } from '@/design-system/components/icons';
import { likeLabel } from './likeCopy';
import { signInPath, type LikeSource } from './socialActions';
import { subjectNoun, useQuestSocial } from './useQuestSocial';

// The prototype's like: a round outlined heart, and the count beside it.
const circle =
  'flex size-11 shrink-0 items-center justify-center rounded-pill border-2 border-line-control text-brand-strong transition-transform active:scale-90 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-brand-strong';

/** Signed out, the heart is a sign-in link that comes back here and counts the like (M10). */
export function LikeButton({ source }: { source: LikeSource }) {
  const { viewer, liked, likeCount, toggleLike, path, tripKey, subject } = useQuestSocial();
  const label = likeLabel(likeCount);
  const noun = subjectNoun(subject);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {viewer.signedIn ? (
        <button
          type="button"
          className={circle}
          aria-pressed={liked}
          aria-label={liked ? `Unlike this ${noun}` : `Like this ${noun}`}
          onClick={() => toggleLike(source)}
        >
          <HeartIcon size={20} filled={liked} />
        </button>
      ) : (
        <Link href={signInPath('like', path, tripKey)} className={circle} aria-label={`Like this ${noun}`}>
          <HeartIcon size={20} />
        </Link>
      )}
      <span className="truncate text-body font-semibold text-ink">{label}</span>
    </div>
  );
}
