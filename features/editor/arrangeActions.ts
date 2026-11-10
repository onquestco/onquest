'use server';

import { z } from 'zod';
import { action } from '@/lib/action';
import { writeCaptions as askModel } from '@/lib/captions';
import { geocoderFor } from '@/lib/geoServer';
import { saveError } from './dbErrors';
import { captionTargets, withCaptions } from './captionTargets';
import { loadOwnTrip } from './questRows';

// The server half of "Arranging your Quest" (spec A §3.2–3.5): town names and captions.
// Every action checks the caller owns the draft (RLS) before calling anyone else's service.

/** ~1 km: photo GPS never reaches the server more exactly than this. */
const round = (value: number) => Math.round(value * 100) / 100;
const PointSchema = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .transform(({ lat, lng }) => ({ lat: round(lat), lng: round(lng) }));

const NameLocationsSchema = z.object({ key: z.uuid(), points: z.array(PointSchema).max(5) });

/** Town names for up to 5 photo clusters, in order; null where none came back within 5 s. */
export const nameLocations = action(NameLocationsSchema, async ({ key, points }, { user, db }) => {
  if (!(await loadOwnTrip(db, key))) return { named: false as const, error: 'not_found' as const };
  return { named: true as const, places: await geocoderFor(user.id).nameLocations(points) };
});

const SearchSchema = z.object({ key: z.uuid(), text: z.string().trim().min(2).max(100) });

/** "Search for a town" in the photo sheet. Submit only; up to 5 results. */
export const searchPlaces = action(SearchSchema, async ({ key, text }, { user, db }) => {
  if (!(await loadOwnTrip(db, key))) return { found: false as const, error: 'not_found' as const };
  return { found: true as const, places: await geocoderFor(user.id).searchPlaces(text) };
});

const CaptionsSchema = z.object({ key: z.uuid(), basedOn: z.string().min(1) });

/**
 * Captions for photos with a place and no caption, saved into the draft as automatic. Reads
 * everything from the stored draft: only towns and dates reach the model. On a timeout or error,
 * no captions and the same savedAt (the Quest still looks finished).
 */
export const writeCaptions = action(CaptionsSchema, async ({ key, basedOn }, { db }) => {
  const own = await loadOwnTrip(db, key);
  if (!own) return { written: false as const, error: 'not_found' as const };
  const unchanged = { written: true as const, captions: [], savedAt: basedOn };

  const targets = captionTargets(own.draft.document);
  // Every eligible photo already has a caption: no model call (bounds repeat calls).
  if (targets.length === 0) return unchanged;
  const captions = await askModel(targets, { fetch, apiKey: process.env.ANTHROPIC_API_KEY });
  if (captions.length === 0) return unchanged;

  const document = withCaptions(own.draft.document, captions);
  const { data, error } = await db.rpc('save_trip_draft', {
    p_key: key,
    p_based_on: basedOn,
    p_document: document,
  });
  const failure = saveError(error);
  if (failure === 'conflict' || failure === 'not_found') return { written: false as const, error: failure };
  if (error) throw new Error('Could not save captions');
  return { written: true as const, captions, savedAt: data as string };
});

const ProgressSchema = z.object({
  key: z.uuid(),
  uploaded: z
    .object({
      count: z.number().int().min(1).max(15),
      failed: z.number().int().min(0).max(15),
      heic: z.number().int().min(0).max(15),
      bytesTotal: z.number().int().min(0),
    })
    .optional(),
  arranged: z
    .object({
      pages: z.number().int().min(1).max(5),
      photos: z.number().int().min(3).max(15),
      captionsWritten: z.number().int().min(0).max(15),
      fallbackUsed: z.boolean(),
      failed: z.boolean(),
      durationMs: z.number().int().min(0),
    })
    .optional(),
});

/**
 * Upload and arranging results for the photos_uploaded and quest_arranged server events. The
 * events are sent once the analytics plumbing exists (A-07, A-14); until then this only checks
 * ownership, so the client can already call it.
 */
export const reportCreateProgress = action(ProgressSchema, async ({ key }, { db }) => {
  if (!(await loadOwnTrip(db, key))) return { reported: false as const, error: 'not_found' as const };
  return { reported: true as const };
});
