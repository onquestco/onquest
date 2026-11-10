import { z } from 'zod';
import { photoUrls } from '@/lib/storage';
import type { QuestCard } from '@/lib/trip/cards';
import { VisibilitySchema } from '@/lib/trip/schema';
import type { FeedItem, Person } from './schema';

// quest_card_json and person_json (migrations 12, 13), snake_case → the app's shapes.

const UNTITLED = 'Untitled Quest';

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
