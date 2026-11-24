'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/design-system/components/Avatar';
import { ChatIcon, HeartIcon, ShareIcon } from '@/design-system/components/icons';
import { askToSignIn } from '@/features/account/signInPrompt';
import { setBlogLike } from '@/features/blogs/socialActions';
import { timeAgo } from '@/features/notifications/notificationText';
import { toggledLike } from '@/features/trip-page/likeCopy';
import type { HomeFeedItem } from '@/lib/social/schema';
import { shareQuest } from './FeedCard';

type BlogFeedItem = Extract<HomeFeedItem, { type: 'blog' }>;

const pill =
  'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-2.5 text-label font-semibold text-ink-muted focus-visible:outline-2 focus-visible:outline-brand-strong';

/**
 * A blog in the feed (PRD B7, S2): like a Quest card, but text-led. Writer row, a "Blog" tag, the
 * title, two lines of text, the cover if there is one, then like, comment and share. Signed out,
 * Like opens the sign-in popup, which comes back on the blog with the like done (OQ-16).
 */
export function BlogFeedCard({ blog, signedIn = true }: { blog: BlogFeedItem; signedIn?: boolean }) {
  const [like, setLikeState] = useState({ liked: blog.likedByMe, likeCount: blog.likeCount });
  const path = blog.path ?? '/home';
  const subtitle = [blog.placeName, blog.publishedAt ? timeAgo(blog.publishedAt, new Date()) : undefined]
    .filter(Boolean)
    .join(' · ');

  function toggle() {
    if (!signedIn) return askToSignIn({ intent: 'like', next: path, ref: blog.key });
    const before = like;
    const after = toggledLike(before);
    setLikeState(after);
    void setBlogLike({ blogKey: blog.key, liked: after.liked, source: 'feed' }).then(
      (result) =>
        setLikeState(
          result.ok && result.data.saved ? { liked: result.data.liked, likeCount: result.data.likeCount } : before,
        ),
      () => setLikeState(before),
    );
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <Link href={`/@${blog.owner.handle}`} className="flex min-h-11 items-center gap-3 px-3 py-3">
        <Avatar name={blog.owner.name} src={blog.owner.avatarUrl} size={36} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label font-semibold text-ink">{blog.owner.name}</span>
          {subtitle && <span className="truncate text-caption text-ink-muted">{subtitle}</span>}
        </span>
      </Link>
      <Link href={path} className="flex flex-col gap-1.5 px-3 pb-3">
        <span className="self-start rounded-pill bg-brand-wash px-2 py-0.5 text-caption font-bold text-brand-strong">
          Blog
        </span>
        <span className="text-lead font-extrabold text-ink">{blog.title}</span>
        {blog.excerpt && <span className="line-clamp-2 text-body text-ink-muted">{blog.excerpt}</span>}
      </Link>
      {blog.coverThumb && (
        // The same link again for the picture; the text link above is the one screen readers get.
        <Link href={path} tabIndex={-1} aria-hidden className="block aspect-4/3 bg-surface-page">
          <img src={blog.coverThumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        </Link>
      )}
      <div className="flex items-center gap-1 px-2 py-1">
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
        <Link href={`${path}#comments`} className={pill} aria-label="Comments">
          <ChatIcon />
          {blog.commentCount}
        </Link>
        <button
          type="button"
          className={`${pill} ml-auto`}
          aria-label={`Share ${blog.title}`}
          onClick={() => void shareQuest(blog.title, path)}
        >
          <ShareIcon />
        </button>
      </div>
    </article>
  );
}
