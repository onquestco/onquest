'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChatIcon, HeartIcon, ShareIcon } from '@/design-system/components/icons';
import { QuestCardView, questCardMeta } from '@/design-system/components/QuestCardView';
import { askToSignIn } from '@/features/account/signInPrompt';
import { timeAgo } from '@/features/notifications/notificationText';
import { setLike } from '@/features/trip-page/actions';
import { toggledLike } from '@/features/trip-page/likeCopy';
import { withSrc } from '@/lib/analytics/src';
import type { FeedItem } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';

const pill =
  'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-2.5 text-label font-semibold text-ink-muted focus-visible:outline-2 focus-visible:outline-brand-strong';

/** The phone's share sheet where there is one, else copy the link. */
export async function shareQuest(title: string, path: string) {
  const url = `${window.location.origin}${path}`;
  try {
    if (navigator.share) await navigator.share({ title, url });
    else await navigator.clipboard.writeText(url);
  } catch {
    // Closing the share sheet throws; nothing to do.
  }
}

/**
 * A Quest in the feed (M21): like it from here; comments open the Quest at its comments. Signed
 * out, Like opens the sign-in popup, which comes back on the Quest with the like done (OQ-16).
 */
export function FeedCard({
  quest,
  signedIn = true,
  src,
}: {
  quest: FeedItem | QuestCard;
  signedIn?: boolean;
  /** quest_viewed's source code for the card's links (QUEST_SOURCE_CODE); never on the shared link. */
  src?: number;
}) {
  const [like, setLikeState] = useState({
    liked: 'likedByMe' in quest ? quest.likedByMe : false,
    likeCount: quest.likeCount,
  });
  const path = quest.path ?? '/home';
  const tagged = (href: string) => (src === undefined || !quest.path ? href : withSrc(href, src));

  function toggle() {
    if (!signedIn) return askToSignIn({ intent: 'like', next: path, ref: quest.key });
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
      href={tagged(path)}
      title={quest.title}
      coverUrl={quest.coverThumb}
      places={quest.places}
      owner={{ name: quest.owner.name, avatarUrl: quest.owner.avatarUrl, href: `/@${quest.owner.handle}` }}
      when={quest.publishedAt ? timeAgo(quest.publishedAt, new Date()) : undefined}
      meta={questCardMeta(quest.pageCount, quest.photoCount)}
      actions={
        <>
          {/* Icons with counts, as in the prototype. */}
          <button
            type="button"
            className={`${pill} ${like.liked ? 'text-brand-strong' : ''}`}
            aria-pressed={like.liked}
            aria-label="Like"
            onClick={toggle}
          >
            <HeartIcon size={20} filled={like.liked} />
            {like.likeCount > 0 && like.likeCount}
          </button>
          <Link href={tagged(`${path}#comments`)} className={pill} aria-label="Comments">
            <ChatIcon />
            {quest.commentCount}
          </Link>
          <button
            type="button"
            className={`${pill} ml-auto`}
            aria-label={`Share ${quest.title}`}
            onClick={() => void shareQuest(quest.title, path)}
          >
            <ShareIcon />
          </button>
        </>
      }
    />
  );
}
