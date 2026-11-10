import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabase/env';

// Every bucket path lives in this file, so photos can move to another host later.
//   photos  (public):  {userId}/{tripId}/{photoId}/thumb.webp | display.webp
//   exports (private): {userId}/{tripId}/{photoId}/export.jpg
//   photos  (public):  {userId}/avatar/{photoId}/thumb.webp (profile photos, spec C §3.8)
// `folder` below is always "{userId}/{tripId}", as returned by get_trip.

const ONE_YEAR_SECONDS = '31536000'; // files never change: a replaced photo gets a new id

export type PhotoFiles = { thumb: Blob; display: Blob; export: Blob };

export function photoUrls(folder: string, photoId: string) {
  const base = `${supabaseUrl()}/storage/v1/object/public/photos/${folder}/${photoId}`;
  return { thumb: `${base}/thumb.webp`, display: `${base}/display.webp` };
}

/** The private export JPEG's path in the `exports` bucket (signed URLs only). */
export function exportPath(folder: string, photoId: string) {
  return `${folder}/${photoId}/export.jpg`;
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

const BUCKETS = ['photos', 'exports'] as const;
const LIST_LIMIT = 1000;

/** Photo ids that have files in a Quest's folder, in either bucket. */
export async function listPhotoIds(supabase: SupabaseClient, folder: string): Promise<string[]> {
  const ids = new Set<string>();
  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: LIST_LIMIT });
    if (error) throw new Error('Could not list photo files');
    // Each photo is a sub-folder named by its id; folders come back without an object id.
    for (const entry of data ?? []) if (!entry.id) ids.add(entry.name);
  }
  return [...ids];
}

/** When a photo's first file was uploaded, or null if it has none. */
export async function photoUploadedAt(
  supabase: SupabaseClient,
  folder: string,
  photoId: string,
): Promise<string | null> {
  const times: string[] = [];
  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list(`${folder}/${photoId}`);
    if (error) throw new Error('Could not list photo files');
    for (const file of data ?? []) if (file.created_at) times.push(file.created_at);
  }
  return times.sort()[0] ?? null;
}

/** Every file of a Quest, for deleting it. */
export async function deleteQuestFiles(supabase: SupabaseClient, folder: string): Promise<void> {
  await deletePhotoFiles(supabase, folder, await listPhotoIds(supabase, folder));
}

/** A profile photo's public URL. Built on the server from its id, so no outside URL can be set. */
export function avatarUrl(userId: string, photoId: string): string {
  return photoUrls(`${userId}/avatar`, photoId).thumb;
}

/** Every file path under a folder, in every subfolder (Storage lists one level at a time). */
async function listAllFiles(supabase: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error) throw new Error('Could not list files');
    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      // Folders come back without an id.
      if (entry.id) paths.push(path);
      else paths.push(...(await listAllFiles(supabase, bucket, path)));
    }
    if (!data || data.length < 1000) return paths;
  }
}

/** Account deletion: every file a person has, in both buckets (Quests, avatars, removed photos). */
export async function deleteUserFiles(supabase: SupabaseClient, userId: string): Promise<void> {
  for (const bucket of BUCKETS) {
    const paths = await listAllFiles(supabase, bucket, userId);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw new Error('Could not delete files');
    }
  }
}
