'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HeartIcon } from '@/design-system/components/icons';
import { QuestCardView } from '@/design-system/components/QuestCardView';
import { setLike } from '@/features/trip-page/actions';
import { likeLabel, toggledLike } from '@/features/trip-page/likeCopy';
import type { FeedItem } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';

const pill =
  'inline-flex min-h-11 items-center gap-2 rounded-pill border border-line-control bg-surface px-4 text-label font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand-strong';

/** A Quest in the feed (M21): like it from here; comments open the Quest at its comments. */
export function FeedCard({ quest }: { quest: FeedItem | QuestCard }) {
  const [like, setLikeState] = useState({
    liked: 'likedByMe' in quest ? quest.likedByMe : false,
    likeCount: quest.likeCount,
  });
  const path = quest.path ?? '/home';

  function toggle() {
    const before = like;
    const after = toggledLike(before);
    setLikeState(after);
    void setLike({ tripKey: quest.key, liked: after.liked, source: 'feed' }).then(
      (result) =>
        setLikeState(
          result.ok && result.data.saved
            ? { liked: result.data.liked, likeCount: result.data.likeCount }
            : before,
        ),
      () => setLikeState(before),
    );
  }

  return (
    <QuestCardView
      href={path}
      title={quest.title}
      coverUrl={quest.coverThumb}
      places={quest.places}
      owner={{ name: quest.owner.name, avatarUrl: quest.owner.avatarUrl, href: `/@${quest.owner.handle}` }}
      actions={
        <>
          <button type="button" className={pill} aria-pressed={like.liked} onClick={toggle}>
            <span className={like.liked ? 'text-brand-strong' : ''}>
              <HeartIcon size={20} filled={like.liked} />
            </span>
            {likeLabel(like.likeCount, like.liked)}
          </button>
          <Link href={`${path}#comments`} className={pill}>
            {quest.commentCount === 0
              ? 'Comment'
              : `${quest.commentCount} ${quest.commentCount === 1 ? 'comment' : 'comments'}`}
          </Link>
        </>
      }
    />
  );
}
