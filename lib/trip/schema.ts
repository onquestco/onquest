import { z } from 'zod';

// Shapes of trip data as stored in the database (trips.content).
// zod is the single source of truth: types below are inferred, never written by hand.

export const DaySchema = z.object({
  id: z.uuid(),
  title: z.string().trim().max(40).optional(),
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

// What the get_trip database function returns.
export const TripRowsSchema = z.object({
  trip: z.object({
    id: z.uuid(),
    slug: z.string(),
    template_id: z.string(),
    visibility: VisibilitySchema,
    title: z.string().nullable(),
    short_title: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    cover_photo_id: z.uuid().nullable(),
    seed: z.number(),
    content: TripContentSchema,
    published_at: z.string().nullable(),
    updated_at: z.string(),
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
