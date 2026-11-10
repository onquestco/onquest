import { processInTurn } from './browserUploadDeps';
import type { PickedForDraft } from './draftStore';

/** Reads photos added on the Review screen (Add, Replace). Unreadable ones are skipped. */
export async function readPhotos(files: File[]): Promise<PickedForDraft[]> {
  const read = await Promise.all(
    files.map(async (file) => {
      try {
        const image = await processInTurn(file);
        return {
          id: crypto.randomUUID(),
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
