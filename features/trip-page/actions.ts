'use server';

import { updateTag } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { action } from '@/lib/action';
import { tripSocialTag } from '@/lib/cacheTags';
import { notifyQuestOwner } from '@/lib/email/notifyServer';
import type { Comment } from '@/lib/social/schema';
import { reactionError } from './socialRows';

// Likes and comments on the Quest page (spec B §4.2). Each refreshes only the Quest's social
// tag: a like never rebuilds the page itself.

const LikeSchema = z.object({
  tripKey: z.uuid(),
  liked: z.boolean(),
  source: z.enum(['quest_page', 'fullscreen', 'feed', 'after_sign_in']), // quest_liked.source (B-10)
});

export const setLike = action(LikeSchema, async ({ tripKey, liked }, { user, db }) => {
  const { data, error } = await db.rpc('set_like', { p_trip_key: tripKey, p_liked: liked });
  if (reactionError(error) === 'not_visible') return { saved: false as const, error: 'not_visible' as const };
  if (error) throw new Error('Could not save like');
  const result = z.object({ liked: z.boolean(), notified: z.boolean(), like_count: z.number() }).parse(data);
  updateTag(tripSocialTag(tripKey));
  // Only a person's first like ever on this Quest notifies (the bell did, so the email does too).
  if (result.notified) after(() => notifyQuestOwner({ kind: 'like', tripKey, actorKey: user.id }));
  return { saved: true as const, liked: result.liked, likeCount: result.like_count };
});

const CommentSchema = z.object({ tripKey: z.uuid(), body: z.string().trim().min(1).max(300) });

export const postComment = action(CommentSchema, async ({ tripKey, body }, { user, db }) => {
  const { data, error } = await db.rpc('post_comment', { p_trip_key: tripKey, p_body: body });
  const failure = reactionError(error);
  if (failure === 'comments_off' || failure === 'not_visible' || failure === 'too_fast') {
    return { posted: false as const, error: failure };
  }
  if (error) throw new Error('Could not post comment');
  const saved = z.object({ key: z.uuid(), saved_at: z.string() }).parse(data);
  const profile = await getMyProfile(user.id);
  updateTag(tripSocialTag(tripKey));
  after(() => notifyQuestOwner({ kind: 'comment', tripKey, actorKey: user.id, commentBody: body }));
  const comment: Comment = {
    key: saved.key,
    body,
    savedAt: saved.saved_at,
    author: { key: user.id, handle: profile?.handle ?? '', name: profile?.name ?? profile?.handle ?? '' },
  };
  return { posted: true as const, comment };
});

/** The Quest's owner removes a comment (abuse: one tap). */
export const deleteComment = action(z.object({ commentKey: z.uuid() }), async ({ commentKey }, { db }) => {
  const { data, error } = await db.rpc('delete_comment', { p_comment_key: commentKey });
  const failure = reactionError(error);
  if (failure === 'not_owner' || failure === 'not_found') return { deleted: false as const, error: failure };
  if (error) throw new Error('Could not delete comment');
  updateTag(tripSocialTag(z.uuid().parse(data)));
  return { deleted: true as const };
});
