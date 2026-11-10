import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabase/env';

// Every bucket path lives in this file, so photos can move to another host later.
//   photos  (public):  {userId}/{tripId}/{photoId}/thumb.webp | display.webp
//   exports (private): {userId}/{tripId}/{photoId}/export.jpg
// `folder` below is always "{userId}/{tripId}", as returned by get_trip.

const ONE_YEAR_SECONDS = '31536000'; // files never change: a replaced photo gets a new id

export type PhotoFiles = { thumb: Blob; display: Blob; export: Blob };

export function photoUrls(folder: string, photoId: string) {
  const base = `${supabaseUrl()}/storage/v1/object/public/photos/${folder}/${photoId}`;
  return { thumb: `${base}/thumb.webp`, display: `${base}/display.webp` };
}

type Upload = { bucket: 'photos' | 'exports'; name: string; file: Blob };

async function uploadAll(supabase: SupabaseClient, folder: string, photoId: string, uploads: Upload[]) {
  await Promise.all(
    uploads.map(async ({ bucket, name, file }) => {
      const { error } = await supabase.storage
        .from(bucket)
        // The stored content type wins over the name, so Safari's JPEG fallback displays fine at a .webp path.
        .upload(`${folder}/${photoId}/${name}`, file, {
          cacheControl: ONE_YEAR_SECONDS,
          contentType: file.type,
        });
      // A retry can find a file from the attempt before it. The id is unique, so it's the same photo.
      if (error && !/exists|duplicate/i.test(error.message)) throw error;
    }),
  );
}

/** The sizes the Quest shows. Uploaded first, so the draft and preview don't wait for the export. */
export function uploadPhotoViews(
  supabase: SupabaseClient,
  folder: string,
  photoId: string,
  files: Pick<PhotoFiles, 'thumb' | 'display'>,
): Promise<void> {
  return uploadAll(supabase, folder, photoId, [
    { bucket: 'photos', name: 'thumb.webp', file: files.thumb },
    { bucket: 'photos', name: 'display.webp', file: files.display },
  ]);
}

/** The large JPEG for Instagram export. Uploaded last. */
export function uploadPhotoExport(supabase: SupabaseClient, folder: string, photoId: string, file: Blob) {
  return uploadAll(supabase, folder, photoId, [{ bucket: 'exports', name: 'export.jpg', file }]);
}

export async function deletePhotoFiles(
  supabase: SupabaseClient,
  folder: string,
  photoIds: string[],
): Promise<void> {
  if (photoIds.length === 0) return;
  const [photos, exports] = await Promise.all([
    supabase.storage
      .from('photos')
      .remove(photoIds.flatMap((id) => [`${folder}/${id}/thumb.webp`, `${folder}/${id}/display.webp`])),
    supabase.storage.from('exports').remove(photoIds.map((id) => `${folder}/${id}/export.jpg`)),
  ]);
  if (photos.error || exports.error) throw new Error('Could not delete photo files');
}
