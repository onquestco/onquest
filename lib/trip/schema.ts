import { z } from 'zod';

// Shapes of trip data as stored in the database (trips.content).
// zod is the single source of truth: types below are inferred, never written by hand.

// A "page" in the product is a Day in stored content. Existing fields and limits never narrow:
// old rows are parsed on every view (CLAUDE.md, backward compatibility).
export const DaySchema = z.object({
  id: z.uuid(),
  title: z.string().trim().max(40).optional(),
  /** Missing on old rows: a set title then counts as the traveller's own. */
  titleSource: z.enum(['auto', 'user']).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  quote: z.string().trim().max(60).optional(),
  story: z.string().trim().max(500).optional(),
  placeIds: z.array(z.uuid()).max(6),
  photoIds: z.array(z.uuid()).max(40),
});

export const TripContentSchema = z.object({
  destination: z.string().trim().max(30).optional(),
  note: z.string().trim().max(600).optional(),
  closingHeadline: z.string().trim().max(40).optional(),
  favourites: z.array(z.uuid()).max(3),
  days: z.array(DaySchema).max(30),
});

export type DayContent = z.infer<typeof DaySchema>;
export type TripContent = z.infer<typeof TripContentSchema>;

export const VisibilitySchema = z.enum(['public', 'unlisted', 'private']);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const TripPhotoSchema = z.object({
  /** Permanent key, also the storage folder name. */
  id: z.uuid(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().trim().max(80).optional(),
  captionSource: z.enum(['auto', 'user']).optional(),
  /** Owner-only, never returned publicly. */
  takenAt: z.iso.datetime({ offset: true }).optional(),
  /** Owner-only: the EXIF day, or one set by hand. */
  date: z.iso.date().optional(),
  placeId: z.uuid().optional(),
});

export const TripPlaceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60),
  /** The town's centre from the geocoder, never photo GPS. */
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Nominatim osm_type + osm_id, e.g. "R1234". */
  geoRef: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  note: z.string().trim().max(300).optional(),
  photoId: z.uuid().optional(),
});

/** The editable document, as stored in trip_drafts and copied to trips on publish. */
export const QuestDocumentSchema = z.object({
  templateId: z.string(),
  title: z.string().trim().max(60).optional(),
  shortTitle: z.string().trim().max(30).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  coverPhotoId: z.uuid().optional(),
  /** First photo picked, for minutes_since_start. Owner-only. */
  startedAt: z.iso.datetime({ offset: true }).optional(),
  content: TripContentSchema,
  // Stored limits fit old test trips; the 15-photo rule is enforced on save (lib/trip/limits.ts).
  photos: z.array(TripPhotoSchema).max(80),
  places: z.array(TripPlaceSchema).max(60),
});

export type TripPhoto = z.infer<typeof TripPhotoSchema>;
export type TripPlace = z.infer<typeof TripPlaceSchema>;
export type QuestDocument = z.infer<typeof QuestDocumentSchema>;

// What the get_trip database function returns. Fields added by migration 9 are optional, so code
// deployed before or after it parses either output (spec A §8).
export const TripRowsSchema = z.object({
  trip: z.object({
    /** Same value as `key`, kept for compatibility. */
    id: z.uuid(),
    key: z.uuid().optional(),
    slug: z.string(),
    template_id: z.string(),
    visibility: VisibilitySchema,
    status: z.literal('published').optional(),
    title: z.string().nullable(),
    short_title: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    cover_photo_id: z.uuid().nullable(),
    seed: z.number(),
    content: TripContentSchema,
    word_count: z.number().optional(),
    published_at: z.string().nullable(),
    /** Same value as `saved_at`, kept for compatibility. */
    updated_at: z.string(),
    saved_at: z.string().optional(),
    comments_on: z.boolean().optional(),
  }),
  owner: z.object({
    handle: z.string(),
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
  photo_folder: z.string(),
  photos: z.array(
    z.object({
      id: z.uuid(),
      width: z.number(),
      height: z.number(),
      caption: z.string().nullable(),
    }),
  ),
  places: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
      note: z.string().nullable(),
      photo_id: z.uuid().nullable(),
    }),
  ),
});

export type TripRows = z.infer<typeof TripRowsSchema>;
