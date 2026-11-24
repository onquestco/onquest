import { z } from 'zod';
import { BlogCardSchema } from '@/lib/blog/cards';
import { QuestCardSchema } from '@/lib/trip/cards';
import { VisibilitySchema } from '@/lib/trip/schema';

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
  quest: z
    .object({ key: z.uuid(), title: z.string(), path: z.string(), coverThumb: z.string().optional() })
    .optional(),
  /** A like or comment on a blog (blogs spec §3.6): there's a blog instead of a quest. */
  blog: z
    .object({ key: z.uuid(), title: z.string(), path: z.string(), coverThumb: z.string().optional() })
    .optional(),
  commentExcerpt: z.string().max(80).optional(),
});
export const COMMENT_MAX = 300;

export type Comment = z.infer<typeof CommentSchema>;
export type QuestSocial = z.infer<typeof QuestSocialSchema>;
export type ViewerState = z.infer<typeof ViewerStateSchema>;
export type NotificationItem = z.infer<typeof NotificationItemSchema>;

/** A blog's viewer (blogs spec §4.1): the Quest viewer, plus what only the writer gets. */
export const BlogViewerSchema = ViewerStateSchema.extend({
  /** Owner only: the ⋯ menu's conflict token. */
  savedAt: z.string().optional(),
  /** Owner only. */
  visibility: VisibilitySchema.optional(),
  /** Owner only: "Your linked Quest isn't visible to readers". */
  linkedQuestHidden: z.boolean().default(false),
  /** Owner only: the linked Quest's card whenever readers can't see it (private, or unlisted on a public blog). */
  ownLinkedQuest: QuestCardSchema.optional(),
});
export type BlogViewer = z.infer<typeof BlogViewerSchema>;

// Spec C §4.1: people, the feed, search.
export const PersonSchema = z.object({
  key: z.uuid(),
  handle: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  homeCity: z.string().optional(),
  following: z.boolean().optional(), // only when a signed-in viewer asked
});
export const FeedItemSchema = QuestCardSchema.extend({ likedByMe: z.boolean() });
/** One Home feed item: a Quest, or a public blog (blogs spec §4.1, S2). */
export const HomeFeedItemSchema = z.discriminatedUnion('type', [
  FeedItemSchema.extend({ type: z.literal('quest') }),
  BlogCardSchema.extend({ type: z.literal('blog'), likedByMe: z.boolean() }),
]);
// Two users: getFeedPage builds it, and HomeFeed parses "Load more" pages from /api/feed with it.
export const FeedPageSchema = z.object({
  items: z.array(HomeFeedItemSchema),
  nextOffset: z.number().int().nullable(),
  now: z.string(),
});
export const GuideCardSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  minutes: z.number().int(),
});
export const SearchResultsSchema = z.object({
  quests: z.array(QuestCardSchema).max(10),
  people: z.array(PersonSchema).max(10),
  guides: z.array(GuideCardSchema).max(5),
  /** Blogs spec §3.5: shown under "Stories" with the guides. Absent from older responses. */
  blogs: z.array(BlogCardSchema).max(10).default([]),
});

export type Person = z.infer<typeof PersonSchema>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export type HomeFeedItem = z.infer<typeof HomeFeedItemSchema>;
export type FeedPage = z.infer<typeof FeedPageSchema>;
export type GuideCard = z.infer<typeof GuideCardSchema>;
export type SearchResults = z.infer<typeof SearchResultsSchema>;
