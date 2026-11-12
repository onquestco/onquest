'use client';

import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { FollowButton } from '@/features/profile/FollowButton';
import type { TripData } from '@/lib/trip/types';
import { CommentComposer } from './CommentComposer';
import { CommentList } from './CommentList';
import { LikeButton } from './LikeButton';
import { useQuestSocial } from './useQuestSocial';

/**
 * Under the Quest (screen 9, the prototype's box): the like on the left, who made it on the right
 * with Follow for signed-in people who aren't the creator, then comments and the comment box.
 * Comments off hides every comment (M14).
 */
export function QuestSocial({ traveler }: { traveler: TripData['traveler'] }) {
  const { commentsOn, viewer, viewerKnown, ownerKey, path } = useQuestSocial();
  const canFollow = viewerKnown && viewer.signedIn && !viewer.isOwner && ownerKey;

  return (
    <section aria-label="Likes and comments" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <LikeButton source="quest_page" />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/@${traveler.handle}`}
            className="flex min-h-11 items-center gap-2 text-label font-normal text-ink-muted"
          >
            <Avatar name={traveler.name} src={traveler.avatar?.thumb} size={28} />@{traveler.handle}
          </Link>
          {canFollow && (
            <FollowButton
              targetKey={ownerKey}
              following={viewer.followingOwner}
              signedIn
              returnPath={path}
              source="quest"
              size="small"
            />
          )}
        </div>
      </div>
      <div id="comments" className="flex flex-col gap-3">
        {commentsOn ? (
          <>
            <CommentList />
            <CommentComposer />
          </>
        ) : (
          <p className="text-label font-normal text-ink-muted">Comments are off for this Quest.</p>
        )}
      </div>
    </section>
  );
}
