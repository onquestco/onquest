import { z } from 'zod';

// Shapes of the Quest page's social data (spec B §4). B-03 builds the screens on these with
// sample data; B-05 fills them from get_trip_social and the /me route.

export const CommentSchema = z.object({
  key: z.uuid(),
  body: z.string(),
  savedAt: z.string(),
  author: z.object({ key: z.uuid(), handle: z.string(), name: z.string(), avatarUrl: z.string().optional() }),
});
export const QuestSocialSchema = z.object({
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  commentsOn: z.boolean(),
  comments: z.array(CommentSchema).max(100), // [] when comments are off
});
export const ViewerStateSchema = z.object({
  signedIn: z.boolean(),
  liked: z.boolean(),
  isOwner: z.boolean(),
  followingOwner: z.boolean().default(false), // filled by spec C
});
export const NotificationItemSchema = z.object({
  key: z.uuid(),
  kind: z.enum(['like', 'comment', 'follow']),
  savedAt: z.string(),
  unread: z.boolean(),
  likeCount: z.number().int().optional(), // grouped likes
  actor: z.object({ handle: z.string(), name: z.string(), avatarUrl: z.string().optional() }).optional(), // never for likes
  quest: z.object({ key: z.uuid(), title: z.string(), path: z.string(), coverThumb: z.string().optional() }).optional(),
  commentExcerpt: z.string().max(80).optional(),
});
export const COMMENT_MAX = 300;

export type Comment = z.infer<typeof CommentSchema>;
export type QuestSocial = z.infer<typeof QuestSocialSchema>;
export type ViewerState = z.infer<typeof ViewerStateSchema>;
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
