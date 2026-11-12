import { z } from 'zod';
import { VisibilitySchema } from './schema';

/** A Quest as a card: Home, Your Quests, feed, Explore, profiles. */
export const QuestCardSchema = z.object({
  key: z.uuid(),
  title: z.string(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  /** "/@riya/goa-trip", published only. */
  path: z.string().optional(),
  coverThumb: z.string().optional(),
  pageCount: z.number().int(),
  photoCount: z.number().int(),
  /** Place names, for feed and cards. */
  places: z.array(z.string()).max(3),
  likeCount: z.number().int().default(0),
  commentCount: z.number().int().default(0),
  publishedAt: z.string().optional(),
  /** The live row's saved_at: the ⋯ menu's conflict token. Opaque, never parsed as a Date. */
  savedAt: z.string(),
  /** Own cards only: whether comments are on (the ⋯ menu's switch). */
  commentsOn: z.boolean().optional(),
  /** Own cards only: the draft's saved_at. */
  draftSavedAt: z.string().optional(),
  owner: z.object({
    key: z.uuid(),
    handle: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional(),
  }),
});

export type QuestCard = z.infer<typeof QuestCardSchema>;
