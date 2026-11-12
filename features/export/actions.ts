'use server';

import { z } from 'zod';
import { action } from '@/lib/action';
import { photoUrls } from '@/lib/storage';

// Image URLs for "Download for Instagram" (spec B §3.7). The large export.jpg lives in the
// owner-only bucket, so it's signed for an hour; a photo without one (old, or still uploading)
// falls back to its display size.

const ONE_HOUR = 60 * 60;

export const getExportUrls = action(z.object({ tripKey: z.uuid() }), async ({ tripKey }, { user, db }) => {
  const { data, error } = await db
    .from('trips')
    .select('photos')
    .eq('key', tripKey)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error('Could not load Quest');
  if (!data) return { found: false as const, error: 'not_owner' as const }; // RLS: only the owner's rows
  const photoIds = z
    .array(z.object({ id: z.uuid() }))
    .parse(data.photos)
    .map((photo) => photo.id);

  const folder = `${user.id}/${tripKey}`;
  const { data: signed } = await db.storage.from('exports').createSignedUrls(
    photoIds.map((id) => `${folder}/${id}/export.jpg`),
    ONE_HOUR,
  );
  const signedById = new Map(
    (signed ?? []).filter((item) => item.signedUrl && !item.error).map((item) => [item.path, item.signedUrl]),
  );
  return {
    found: true as const,
    photos: photoIds.map((id) => ({
      id,
      url: signedById.get(`${folder}/${id}/export.jpg`) ?? photoUrls(folder, id).display,
    })),
  };
});
