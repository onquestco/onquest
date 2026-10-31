import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { tripUrlTag } from '@/lib/cacheTags';
import { HANDLE_PATTERN } from '@/lib/handles';
import { createPublicSupabase } from '@/lib/supabase/public';
import { TripRowsSchema } from '@/lib/trip/schema';
import { toTripData } from '@/lib/trip/toTripData';
import { getTemplate } from '@/templates/registry';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function fetchTripRows(handle: string, slug: string) {
  const { data, error } = await createPublicSupabase().rpc('get_trip', { p_handle: handle, p_slug: slug });
  // Throwing keeps a database hiccup out of the cache, where it would look like a missing trip.
  if (error) throw new Error('Could not load trip');
  return data === null ? null : TripRowsSchema.parse(data);
}

/** A published public or unlisted trip, or null. Cached until the trip's URL tag is refreshed. */
export const getTrip = cache(async (rawHandle: string, rawSlug: string) => {
  const handle = rawHandle.toLowerCase();
  const slug = rawSlug.toLowerCase();
  // Stops junk URLs from filling the cache or reaching the database.
  if (!HANDLE_PATTERN.test(handle) || !SLUG_PATTERN.test(slug)) return null;

  const rows = await unstable_cache(() => fetchTripRows(handle, slug), ['trip', handle, slug], {
    tags: [tripUrlTag(handle, slug)],
  })();
  if (!rows) return null;

  return {
    trip: toTripData(rows, getTemplate(rows.trip.template_id).defaults),
    unlisted: rows.trip.visibility === 'unlisted',
  };
});
