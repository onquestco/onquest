import 'server-only';
import { exportPath } from '@/lib/storage';
import { createAdminSupabase } from '@/lib/supabase/admin';

const FIVE_MINUTES = 300;

/**
 * A short-lived URL to the cover's export JPEG, for drawing the link preview. The preview renderer
 * reads JPEG and PNG but not the WebP the page shows. null when there's no export file (an old
 * photo, or the server key isn't set): the preview is then drawn without a photo.
 */
export async function previewCoverUrl(photoFolder: string, photoId: string): Promise<string | null> {
  if (!process.env.SUPABASE_SECRET_KEY) return null;
  const { data, error } = await createAdminSupabase()
    .storage.from('exports')
    .createSignedUrl(exportPath(photoFolder, photoId), FIVE_MINUTES);
  return error || !data ? null : data.signedUrl;
}
