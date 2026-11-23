import { z } from 'zod';
import { VisibilitySchema } from '@/lib/trip/schema';

/** A blog as a card: profile, Quests tab, feed, Explore, search (one shape for all of them). */
export const BlogCardSchema = z.object({
  key: z.uuid(),
  /** "Untitled blog" for an untitled draft (own lists only). */
  title: z.string(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  /** "/@riya/blog/goa-on-15k", published only. */
  path: z.string().optional(),
  /** Whitespace collapsed; cards clamp to 1 or 2 lines. */
  excerpt: z.string().max(300),
  /** Absent → LetterTile with the title's first letter. */
  coverThumb: z.string().optional(),
  photoCount: z.number().int(),
  readMinutes: z.number().int().min(1),
  placeName: z.string().optional(),
  likeCount: z.number().int().default(0),
  commentCount: z.number().int().default(0),
  publishedAt: z.string().optional(),
  /** The live row's saved_at: the ⋯ menu's conflict token. Opaque, never parsed as a Date. */
  savedAt: z.string(),
  /** Own cards only. */
  commentsOn: z.boolean().optional(),
  /** Own cards only. */
  draftSavedAt: z.string().optional(),
  owner: z.object({
    key: z.uuid(),
    handle: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional(),
  }),
});

export type BlogCard = z.infer<typeof BlogCardSchema>;
