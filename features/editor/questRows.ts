import type { SupabaseClient } from '@supabase/supabase-js';
import { QuestDocumentSchema, VisibilitySchema, type QuestDocument } from '@/lib/trip/schema';
import { z } from 'zod';

// The owner's own rows, read through RLS. saved_at comes back as text (`::text`): it's the conflict
// token the save functions compare, so it must be the exact string Postgres produces.

const TRIP_COLUMNS =
  'key, status, visibility, slug, seed, published_at, saved_at_text:saved_at::text, published_draft_saved_at_text:published_draft_saved_at::text';
const DRAFT_COLUMNS =
  'key, template_id, title, short_title, start_date, end_date, cover_photo_key, content, photos, places, started_at, saved_at_text:saved_at::text';

const TripRowSchema = z.object({
  key: z.uuid(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  slug: z.string(),
  seed: z.number(),
  published_at: z.string().nullable(),
  saved_at_text: z.string(),
  published_draft_saved_at_text: z.string().nullable(),
});
const DraftRowSchema = z.object({
  key: z.uuid(),
  template_id: z.string(),
  title: z.string().nullable(),
  short_title: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  cover_photo_key: z.uuid().nullable(),
  content: z.unknown(),
  photos: z.unknown(),
  places: z.unknown(),
  started_at: z.string().nullable(),
  saved_at_text: z.string(),
});

export type TripRow = z.infer<typeof TripRowSchema>;
export type DraftRow = z.infer<typeof DraftRowSchema> & { document: QuestDocument };

/** The draft's columns as the editable document. Absent values are left out, as the editor writes them. */
function toDocument(row: z.infer<typeof DraftRowSchema>): QuestDocument {
  return QuestDocumentSchema.parse({
    templateId: row.template_id,
    title: row.title ?? undefined,
    shortTitle: row.short_title ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    coverPhotoId: row.cover_photo_key ?? undefined,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    content: row.content,
    photos: row.photos,
    places: row.places,
  });
}

export async function loadOwnTrips(db: SupabaseClient, keys?: string[]) {
  let trips = db.from('trips').select(TRIP_COLUMNS);
  let drafts = db.from('trip_drafts').select(DRAFT_COLUMNS);
  if (keys) {
    trips = trips.in('key', keys);
    drafts = drafts.in('key', keys);
  }
  const [tripResult, draftResult] = await Promise.all([trips, drafts]);
  if (tripResult.error || draftResult.error) throw new Error('Could not load Quests');
  const draftsByKey = new Map(
    z
      .array(DraftRowSchema)
      .parse(draftResult.data)
      .map((row) => [row.key, { ...row, document: toDocument(row) }] as const),
  );
  return z
    .array(TripRowSchema)
    .parse(tripResult.data)
    .flatMap((trip) => {
      const draft = draftsByKey.get(trip.key);
      return draft ? [{ trip, draft }] : [];
    });
}

export async function loadOwnTrip(db: SupabaseClient, key: string) {
  return (await loadOwnTrips(db, [key]))[0] ?? null;
}
