import { z } from 'zod';
import type { QuestSocial } from '@/lib/social/schema';

// get_trip_social's snake_case output → the app's QuestSocial.

const RowSchema = z.object({
  like_count: z.number().int(),
  comment_count: z.number().int(),
  comments_on: z.boolean(),
  comments: z.array(
    z.object({
      key: z.uuid(),
      body: z.string(),
      saved_at: z.string(),
      author: z.object({
        key: z.uuid(),
        handle: z.string(),
        name: z.string(),
        avatar_url: z.string().nullable(),
      }),
    }),
  ),
});

export function toQuestSocial(raw: unknown): QuestSocial {
  const row = RowSchema.parse(raw);
  return {
    likeCount: row.like_count,
    commentCount: row.comment_count,
    commentsOn: row.comments_on,
    comments: row.comments.map((comment) => ({
      key: comment.key,
      body: comment.body,
      savedAt: comment.saved_at,
      author: {
        key: comment.author.key,
        handle: comment.author.handle,
        name: comment.author.name,
        avatarUrl: comment.author.avatar_url ?? undefined,
      },
    })),
  };
}

/** What a failed reaction function means (migration 10 error codes). */
export function reactionError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.code === 'OQ404')
    return error.message?.includes('not visible') ? ('not_visible' as const) : ('not_found' as const);
  if (error.code === 'OQ403')
    return error.message?.includes('comments off') ? ('comments_off' as const) : ('not_owner' as const);
  if (error.code === 'OQ429') return 'too_fast' as const;
  if (error.code === 'OQ422') return 'invalid' as const;
  return null;
}
