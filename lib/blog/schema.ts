import { z } from 'zod';
import { BLOG_BODY_MAX, BLOG_MAX_PHOTOS, BLOG_TITLE_MAX } from './limits';
import type { BlogBlock } from './markdown';

// Stored blog shapes (spec docs/specs/blogs.md §4.1). Fields only ever grow, and new ones are
// optional or have defaults, so drafts and archived rows written today keep parsing.

/**
 * Up to `max` characters, counted as the database's char_length counts them: an emoji is one
 * character, not two UTF-16 units (BL-01 review S1).
 */
const upTo = (max: number) =>
  z.string().refine((text) => [...text].length <= max, { message: `At most ${max} characters` });

export const BlogPhotoSchema = z.object({
  /** Also the storage folder name. */
  id: z.uuid(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** A place the writer chose (geocoder search). Never coordinates, never photo GPS. */
export const BlogPlaceSchema = z.object({
  name: z.string().trim().min(1).pipe(upTo(60)),
  city: upTo(100).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  /** Nominatim osm_type + osm_id. */
  geoRef: z.string().max(200).optional(),
});

/** The editable document, as stored in blog_drafts and copied to blogs on publish. */
export const BlogDocumentSchema = z.object({
  /** Not trimmed while typing; trimmed on publish. */
  title: upTo(BLOG_TITLE_MAX).optional(),
  body: upTo(BLOG_BODY_MAX).default(''),
  /** [0] is the cover. */
  photos: z.array(BlogPhotoSchema).max(BLOG_MAX_PHOTOS).default([]),
  place: BlogPlaceSchema.optional(),
  linkedQuestKey: z.uuid().optional(),
  /** First content typed or photo picked, for minutes_since_start. Owner-only. */
  startedAt: z.iso.datetime({ offset: true }).optional(),
});

export type BlogPhoto = z.infer<typeof BlogPhotoSchema>;
export type BlogPlace = z.infer<typeof BlogPlaceSchema>;
export type BlogDocument = z.infer<typeof BlogDocumentSchema>;

/** What get_blog returns (snake_case). Fields added later must be optional. */
export const BlogRowsSchema = z.object({
  blog: z.object({
    key: z.uuid(),
    slug: z.string(),
    visibility: z.enum(['public', 'unlisted']),
    title: z.string(),
    body: z.string(),
    photos: z.array(z.object({ id: z.uuid(), width: z.number(), height: z.number() })),
    place: z.object({ name: z.string() }).nullable(),
    comments_on: z.boolean(),
    word_count: z.number().int(),
    published_at: z.string(),
    saved_at: z.string(),
  }),
  owner: z.object({
    key: z.uuid(),
    handle: z.string(),
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
  /** "{ownerKey}/{blogKey}" */
  photo_folder: z.string(),
});

export type BlogRows = z.infer<typeof BlogRowsSchema>;

/** What the blog page renders (built by toBlogData(), the only place defaults apply). */
export type BlogData = {
  key: string;
  url: string;
  path: string;
  unlisted: boolean;
  title: string;
  /** The body's formatting, from parseBlogBody() (blogs-editor spec §4.1). */
  blocks: BlogBlock[];
  photos: { id: string; width: number; height: number; display: string; thumb: string }[];
  placeName?: string;
  commentsOn: boolean;
  readMinutes: number;
  wordCount: number;
  publishedAt: string;
  updatedAt: string;
  writer: { key: string; handle: string; name: string; avatarUrl?: string; profileUrl: string };
};
