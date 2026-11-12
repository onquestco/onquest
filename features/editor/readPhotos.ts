import { uploadPhotoExport, uploadPhotoViews } from '@/lib/storage';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { processInTurn } from './browserUploadDeps';
import type { PickedForDraft } from './draftStore';

/**
 * Photos added on the Review screen (Add, Replace). Each joins the draft only once its thumb and
 * display are stored (spec A §6); the export JPEG follows in the background. Photos that can't be
 * read or uploaded are skipped.
 */
export async function readPhotos(files: File[], photoFolder: string): Promise<PickedForDraft[]> {
  const supabase = createBrowserSupabase();
  const read = await Promise.all(
    files.map(async (file) => {
      try {
        const image = await processInTurn(file);
        const id = crypto.randomUUID();
        await uploadPhotoViews(supabase, photoFolder, id, image);
        // Missing only from the Instagram export, which falls back to the display size.
        void uploadPhotoExport(supabase, photoFolder, id, image.export).catch(() => undefined);
        return {
          id,
          width: image.width,
          height: image.height,
          takenAt: image.takenAt,
          previewUrl: URL.createObjectURL(file),
        };
      } catch {
        return undefined;
      }
    }),
  );
  return read.filter((photo) => photo !== undefined);
}
