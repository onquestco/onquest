'use server';

import { after } from 'next/server';
import { z } from 'zod';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { reactionError } from '@/features/trip-page/socialRows';
import { action } from '@/lib/action';
import { trackServer } from '@/lib/analytics/server';
import { notifyBlogOwner } from '@/lib/email/notifyServer';
import { COMMENT_MAX, type Comment } from '@/lib/social/schema';
import { commentPostedProperties, likedProperties } from './blogEvents';
import { refreshBlogSocial } from './refreshBlog';

// Likes and comments on a blog (blogs spec §4.2), the same rules as on a Quest: each refreshes
// only the blog's social tag, so a like never rebuilds the page. Domain errors come back in
// `data`, never thrown. Email and analytics run after the response (after()).

/** Where a like was tapped (content_liked.source, as BLOG_LIKE_SOURCE_CODE). */
export type BlogLikeSource = 'blog_page' | 'feed' | 'after_sign_in';

const LikeSchema = z.object({
  blogKey: z.uuid(),
  liked: z.boolean(),
  source: z.enum(['blog_page', 'feed', 'after_sign_in']),
});

export const setBlogLike = action(LikeSchema, async ({ blogKey, liked, source }, { user, db }) => {
  const { data, error } = await db.rpc('set_blog_like', { p_blog_key: blogKey, p_liked: liked });
  if (reactionError(error) === 'not_visible') return { saved: false as const, error: 'not_visible' as const };
  if (error) throw new Error('Could not save like');
  const result = z.object({ liked: z.boolean(), notified: z.boolean(), like_count: z.number() }).parse(data);
  refreshBlogSocial(blogKey);
  after(async () => {
    // Only a person's first like ever on this blog notifies (the bell did, so the email does too).
    if (result.notified) await notifyBlogOwner({ kind: 'like', blogKey, actorKey: user.id });
    await trackServer('content_liked', user.id, likedProperties(blogKey, liked, source, result.like_count));
  });
  return { saved: true as const, liked: result.liked, likeCount: result.like_count };
});

const CommentSchema = z.object({ blogKey: z.uuid(), body: z.string().trim().min(1).max(COMMENT_MAX) });

export const postBlogComment = action(CommentSchema, async ({ blogKey, body }, { user, db }) => {
  const { data, error } = await db.rpc('post_blog_comment', { p_blog_key: blogKey, p_body: body });
  const failure = reactionError(error);
  if (failure === 'comments_off' || failure === 'not_visible' || failure === 'too_fast') {
    return { posted: false as const, error: failure };
  }
  if (error) throw new Error('Could not post comment');
  const saved = z.object({ key: z.uuid(), saved_at: z.string() }).parse(data);
  const profile = await getMyProfile(user.id);
  refreshBlogSocial(blogKey);
  after(async () => {
    // The writer's own comments notify nobody: notifyBlogOwner checks.
    await notifyBlogOwner({ kind: 'comment', blogKey, actorKey: user.id, commentBody: body });
    await trackServer('comment_posted', user.id, commentPostedProperties(blogKey, body));
  });
  const comment: Comment = {
    key: saved.key,
    body,
    savedAt: saved.saved_at,
    author: { key: user.id, handle: profile?.handle ?? '', name: profile?.name ?? profile?.handle ?? '' },
  };
  return { posted: true as const, comment };
});

/** The blog's writer removes a comment (abuse: one tap). */
export const deleteBlogComment = action(z.object({ commentKey: z.uuid() }), async ({ commentKey }, { db }) => {
  const { data, error } = await db.rpc('delete_blog_comment', { p_comment_key: commentKey });
  const failure = reactionError(error);
  if (failure === 'not_owner' || failure === 'not_found') return { deleted: false as const, error: failure };
  if (error) throw new Error('Could not delete comment');
  refreshBlogSocial(z.uuid().parse(data));
  return { deleted: true as const };
});
