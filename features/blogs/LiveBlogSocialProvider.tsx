'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LikeSource, SocialActions } from '@/features/trip-page/socialActions';
import { useQuestIntent } from '@/features/trip-page/useQuestIntent';
import { QuestSocialProvider } from '@/features/trip-page/useQuestSocial';
import { track } from '@/lib/analytics/client';
import type { BlogViewer, QuestSocial } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';
import { blogReferrer } from './blogReferrer';
import { deleteBlogComment, postBlogComment, setBlogLike, type BlogLikeSource } from './socialActions';
import { useBlogViewer } from './useBlogViewer';

// The blog page's likes and comments: the Quest page's provider with subject "blog" and the blog
// actions (spec §6.2), plus what only a blog page has: the viewer's writer-only fields, and the
// view_id that joins blog_viewed, blog_read_end and blog_quest_opened for one page view (§10).

/** The Quest components' like sources in blog words: the page's own like is blog_page. */
function blogLikeSource(source: LikeSource): BlogLikeSource {
  if (source === 'after_sign_in' || source === 'feed') return source;
  return 'blog_page';
}

function liveActions(blogKey: string): SocialActions {
  return {
    async setLike(liked, source) {
      const result = await setBlogLike({ blogKey, liked, source: blogLikeSource(source) });
      if (!result.ok) return result;
      if (!result.data.saved) return { ok: false, error: result.data.error };
      return { ok: true, data: { liked: result.data.liked, likeCount: result.data.likeCount } };
    },
    async postComment(body) {
      const result = await postBlogComment({ blogKey, body });
      if (!result.ok) return result;
      if (!result.data.posted) return { ok: false, error: result.data.error };
      return { ok: true, data: result.data.comment };
    },
    async deleteComment(commentKey) {
      const result = await deleteBlogComment({ commentKey });
      if (!result.ok) return result;
      if (!result.data.deleted) return { ok: false, error: result.data.error };
      return { ok: true, data: null };
    },
  };
}

type BlogPage = {
  blogKey: string;
  /** One uuid per page view (blog_viewed, blog_read_end, blog_quest_opened). */
  viewId: string;
  /** null until /api/blogs/{key}/me answers. */
  viewer: BlogViewer | null;
  reloadViewer: () => void;
  /** False on the writer's own view (/blogs/[key]): no reader events. */
  trackReading: boolean;
};

const BlogPageContext = createContext<BlogPage | null>(null);

export function useBlogPage(): BlogPage {
  const page = useContext(BlogPageContext);
  if (!page) throw new Error('useBlogPage must be used inside LiveBlogSocialProvider');
  return page;
}

function FinishIntent() {
  useQuestIntent();
  return null;
}

/** blog_viewed once per page view, as soon as we know whether the reader is signed in. */
function useBlogViewed(page: BlogPage, readerQuest: QuestCard | null) {
  const sent = useRef(false);
  const { viewer, trackReading, blogKey, viewId } = page;
  useEffect(() => {
    if (!trackReading || !viewer || sent.current) return;
    sent.current = true;
    track('blog_viewed', {
      blog_id: blogKey,
      view_id: viewId,
      signed_in: viewer.signedIn,
      referrer: blogReferrer(document.referrer, window.location.origin),
      has_quest: readerQuest !== null || (viewer.isOwner && viewer.ownLinkedQuest !== undefined),
    });
  }, [viewer, trackReading, blogKey, viewId, readerQuest]);
}

type Props = {
  blogKey: string;
  /** The blog's canonical path (/@h/blog/s): where sign-in comes back to. */
  path: string;
  ownerKey: string;
  initial: QuestSocial;
  /** The card readers get (get_blog_quest), for blog_viewed.has_quest. */
  readerQuest: QuestCard | null;
  trackReading: boolean;
  children: ReactNode;
};

export function LiveBlogSocialProvider({
  blogKey,
  path,
  ownerKey,
  initial,
  readerQuest,
  trackReading,
  children,
}: Props) {
  const { viewer, reload } = useBlogViewer(blogKey, ownerKey);
  const actions = useMemo(() => liveActions(blogKey), [blogKey]);
  // Made in the browser only: the server render is cached and shared by every reader. Nothing
  // renders it, so the empty server value can't cause a hydration mismatch.
  const [viewId] = useState(() => (typeof window === 'undefined' ? '' : crypto.randomUUID()));
  const page: BlogPage = { blogKey, viewId, viewer, reloadViewer: reload, trackReading };
  useBlogViewed(page, readerQuest);

  return (
    <BlogPageContext.Provider value={page}>
      <QuestSocialProvider
        subject="blog"
        tripKey={blogKey}
        path={path}
        ownerKey={ownerKey}
        initial={initial}
        viewer={viewer}
        actions={actions}
      >
        <FinishIntent />
        {children}
      </QuestSocialProvider>
    </BlogPageContext.Provider>
  );
}
