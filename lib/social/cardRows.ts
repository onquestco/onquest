import { z } from 'zod';
import type { BlogCard } from '@/lib/blog/cards';
import { readMinutes } from '@/lib/blog/toBlogData';
import { photoUrls } from '@/lib/storage';
import type { QuestCard } from '@/lib/trip/cards';
import { VisibilitySchema } from '@/lib/trip/schema';
import type { FeedItem, HomeFeedItem, Person } from './schema';

// quest_card_json, blog_card_json and person_json (migrations 12, 13, 17), snake_case → the
// app's shapes.

const UNTITLED = 'Untitled Quest';
const UNTITLED_BLOG = 'Untitled blog';

const PersonRowSchema = z.object({
  key: z.uuid(),
  handle: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  home_city: z.string().nullable(),
});

const CardRowSchema = z.object({
  key: z.uuid(),
  title: z.string().nullable(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  path: z.string().nullable(),
  cover_photo_key: z.string().nullable(),
  photo_folder: z.string(),
  page_count: z.number().int(),
  photo_count: z.number().int(),
  places: z.array(z.string()),
  like_count: z.number().int(),
  comment_count: z.number().int(),
  published_at: z.string().nullable(),
  saved_at: z.string(),
  owner: PersonRowSchema,
  liked_by_me: z.boolean().optional(),
});

function toPersonFromRow(row: z.infer<typeof PersonRowSchema>): Person {
  return {
    key: row.key,
    handle: row.handle,
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
    homeCity: row.home_city ?? undefined,
  };
}

function toCard(row: z.infer<typeof CardRowSchema>): QuestCard {
  return {
    key: row.key,
    title: row.title ?? UNTITLED,
    status: row.status,
    visibility: row.visibility,
    path: row.path ?? undefined,
    coverThumb: row.cover_photo_key ? photoUrls(row.photo_folder, row.cover_photo_key).thumb : undefined,
    pageCount: row.page_count,
    photoCount: row.photo_count,
    places: row.places.slice(0, 3),
    likeCount: row.like_count,
    commentCount: row.comment_count,
    publishedAt: row.published_at ?? undefined,
    savedAt: row.saved_at,
    owner: {
      key: row.owner.key,
      handle: row.owner.handle,
      name: row.owner.name,
      avatarUrl: row.owner.avatar_url ?? undefined,
    },
  };
}

// blog_card_json (migration 17). list_my_blogs adds the own-card fields.
const BlogCardRowSchema = z.object({
  key: z.uuid(),
  title: z.string().nullable(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  path: z.string().nullable(),
  excerpt: z.string(),
  cover_photo_key: z.string().nullable(),
  photo_folder: z.string(),
  photo_count: z.number().int(),
  word_count: z.number().int(),
  place_name: z.string().nullable(),
  like_count: z.number().int(),
  comment_count: z.number().int(),
  published_at: z.string().nullable(),
  saved_at: z.string(),
  owner: PersonRowSchema,
  comments_on: z.boolean().optional(),
  draft_saved_at: z.string().optional(),
  liked_by_me: z.boolean().optional(),
});

function toBlogCard(row: z.infer<typeof BlogCardRowSchema>): BlogCard {
  return {
    key: row.key,
    title: row.title?.trim() || UNTITLED_BLOG,
    status: row.status,
    visibility: row.visibility,
    path: row.path ?? undefined,
    excerpt: row.excerpt,
    coverThumb: row.cover_photo_key ? photoUrls(row.photo_folder, row.cover_photo_key).thumb : undefined,
    photoCount: row.photo_count,
    readMinutes: readMinutes(row.word_count),
    placeName: row.place_name ?? undefined,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    publishedAt: row.published_at ?? undefined,
    savedAt: row.saved_at,
    commentsOn: row.comments_on,
    draftSavedAt: row.draft_saved_at,
    owner: {
      key: row.owner.key,
      handle: row.owner.handle,
      name: row.owner.name,
      avatarUrl: row.owner.avatar_url ?? undefined,
    },
  };
}

export function toBlogCards(raw: unknown): BlogCard[] {
  return z.array(BlogCardRowSchema).parse(raw).map(toBlogCard);
}

const HomeFeedRowSchema = z.discriminatedUnion('type', [
  CardRowSchema.extend({ type: z.literal('quest') }),
  BlogCardRowSchema.extend({ type: z.literal('blog') }),
]);

/** list_home_feed (migration 17): Quests and blogs in one order, each marked with its type. */
export function toHomeFeedItems(raw: unknown): HomeFeedItem[] {
  return z
    .array(HomeFeedRowSchema)
    .parse(raw)
    .map((row) =>
      row.type === 'quest'
        ? { ...toCard(row), type: 'quest' as const, likedByMe: row.liked_by_me ?? false }
        : { ...toBlogCard(row), type: 'blog' as const, likedByMe: row.liked_by_me ?? false },
    );
}

export function toQuestCards(raw: unknown): QuestCard[] {
  return z.array(CardRowSchema).parse(raw).map(toCard);
}

export function toFeedItems(raw: unknown): FeedItem[] {
  return z
    .array(CardRowSchema)
    .parse(raw)
    .map((row) => ({ ...toCard(row), likedByMe: row.liked_by_me ?? false }));
}

export function toPeople(raw: unknown): Person[] {
  return z.array(PersonRowSchema).parse(raw).map(toPersonFromRow);
}
