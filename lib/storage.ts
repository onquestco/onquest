import { supabaseUrl } from './supabase/env';

// Every bucket path lives in this file, so photos can move to another host later.
// Paths: photos/{userId}/{tripId}/{photoId}/{thumb,display}.webp

/** `folder` is "{userId}/{tripId}", as returned by get_trip. */
export function photoUrls(folder: string, photoId: string) {
  const base = `${supabaseUrl()}/storage/v1/object/public/photos/${folder}/${photoId}`;
  return { thumb: `${base}/thumb.webp`, display: `${base}/display.webp` };
}
