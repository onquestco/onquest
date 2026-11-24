'use client';

import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { FollowButton } from '@/features/profile/FollowButton';
import { PublishedAgo } from '@/features/profile/PublishedAgo';
import { useQuestSocial } from '@/features/trip-page/useQuestSocial';
import type { BlogData } from '@/lib/blog/schema';

type Props = Pick<BlogData, 'writer' | 'publishedAt' | 'readMinutes'>;

/**
 * Who wrote it (PRD B5): avatar, name, @username, "3 days ago · 4 min read", and Follow on other
 * people's blogs. Follow waits for the viewer, so the writer never sees it flash on their own blog;
 * signed out it opens the sign-in popup.
 */
export function WriterRow({ writer, publishedAt, readMinutes }: Props) {
  const { viewer, viewerKnown, ownerKey, path } = useQuestSocial();
  const canFollow = viewerKnown && !viewer.isOwner && ownerKey;

  return (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/@${writer.handle}`} className="flex min-h-11 min-w-0 items-center gap-3">
        <Avatar name={writer.name} src={writer.avatarUrl} size={40} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label font-semibold text-ink">
            {writer.name} <span className="font-normal text-ink-muted">@{writer.handle}</span>
          </span>
          <span className="truncate text-caption text-ink-muted">
            <time dateTime={publishedAt}>
              <PublishedAgo iso={publishedAt} />
            </time>{' '}
            · {readMinutes} min read
          </span>
        </span>
      </Link>
      {canFollow && (
        <FollowButton
          targetKey={ownerKey}
          following={viewer.followingOwner}
          signedIn={viewer.signedIn}
          returnPath={path}
          // user_followed.source has no blog value yet: a blog page counts as a content page.
          source="quest"
          size="small"
        />
      )}
    </div>
  );
}
