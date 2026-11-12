// After a publish, files of photos that are in neither the new published document nor the
// current draft are deleted (spec A §3.7), except anything uploaded in the last hour: that may be
// a photo whose autosave hasn't landed yet.

const RECENT_MS = 60 * 60 * 1000;

export type StoredPhoto = { photoId: string; createdAt: string | null };

export function photosToSweep(stored: StoredPhoto[], keep: Iterable<string>, now: Date): string[] {
  const kept = new Set(keep);
  return stored
    .filter(({ photoId, createdAt }) => {
      if (kept.has(photoId)) return false;
      // Unknown age: keep it. A missed sweep costs a few kilobytes; a wrong one loses a photo.
      if (!createdAt) return false;
      return now.getTime() - new Date(createdAt).getTime() >= RECENT_MS;
    })
    .map(({ photoId }) => photoId);
}
