import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { BlogDocumentSchema, type BlogDocument } from '@/lib/blog/schema';
import { VisibilitySchema } from '@/lib/trip/schema';

// The owner's own blog rows, read through RLS (other people's rows never come back). saved_at
// comes back as text (`::text`): it's the conflict token the save functions compare, so it must
// be the exact string Postgres produces.

const BLOG_COLUMNS =
  'key, status, visibility, slug, title, body, photos, place, comments_on, word_count, published_at, saved_at_text:saved_at::text, published_draft_saved_at_text:published_draft_saved_at::text';
const DRAFT_COLUMNS =
  'key, title, body, photos, place, linked_trip_key, started_at, saved_at_text:saved_at::text';

const BlogRowSchema = z.object({
  key: z.uuid(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  slug: z.string().nullable(),
  title: z.string().nullable(),
  body: z.string(),
  photos: z.array(z.object({ id: z.uuid(), width: z.number(), height: z.number() })),
  place: z.object({ name: z.string() }).nullable(),
  comments_on: z.boolean(),
  word_count: z.number().int(),
  published_at: z.string().nullable(),
  saved_at_text: z.string(),
  published_draft_saved_at_text: z.string().nullable(),
});
const DraftRowSchema = z.object({
  key: z.uuid(),
  title: z.string().nullable(),
  body: z.string(),
  photos: z.unknown(),
  place: z.unknown(),
  linked_trip_key: z.uuid().nullable(),
  started_at: z.string().nullable(),
  saved_at_text: z.string(),
});

export type OwnBlogRow = z.infer<typeof BlogRowSchema>;
export type OwnDraftRow = z.infer<typeof DraftRowSchema> & { document: BlogDocument };

/** The draft's columns as the editable document. Absent values are left out, as the composer writes them. */
function toDocument(row: z.infer<typeof DraftRowSchema>): BlogDocument {
  return BlogDocumentSchema.parse({
    title: row.title ?? undefined,
    body: row.body,
    photos: row.photos,
    place: row.place ?? undefined,
    linkedQuestKey: row.linked_trip_key ?? undefined,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
  });
}

/** The signed-in person's blog and its draft, or null when it isn't theirs or doesn't exist. */
export async function loadOwnBlog(db: SupabaseClient, key: string) {
  const [blogResult, draftResult] = await Promise.all([
    db.from('blogs').select(BLOG_COLUMNS).eq('key', key).maybeSingle(),
    db.from('blog_drafts').select(DRAFT_COLUMNS).eq('key', key).maybeSingle(),
  ]);
  if (blogResult.error || draftResult.error) throw new Error('Could not load blog');
  if (!blogResult.data || !draftResult.data) return null;
  const draft = DraftRowSchema.parse(draftResult.data);
  return {
    blog: BlogRowSchema.parse(blogResult.data),
    draft: { ...draft, document: toDocument(draft) },
  };
}

/** Whether the signed-in person has a blog with this key (RLS). */
export async function ownsBlog(db: SupabaseClient, key: string): Promise<boolean> {
  const { data, error } = await db.from('blogs').select('key').eq('key', key).maybeSingle();
  if (error) throw new Error('Could not load blog');
  return data !== null;
}
