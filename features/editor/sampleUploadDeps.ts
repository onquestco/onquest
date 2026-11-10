import { processInTurn } from './browserUploadDeps';
import { memoryStore } from './pendingUploads';
import type { UploadDeps } from './upload';

// Pick photos on sample data (until the drafts backend lands, A-03/A-04): photos are really
// processed in the worker (so EXIF, HEIC and memory behave as they will), but "uploads" only wait.

const UPLOAD_MS = 700;

export function sampleUploadDeps(): UploadDeps {
  return {
    process: processInTurn,
    uploadViews: () => new Promise((resolve) => setTimeout(resolve, UPLOAD_MS)),
    uploadExport: () => new Promise((resolve) => setTimeout(resolve, UPLOAD_MS * 2)),
    store: memoryStore(),
    createId: () => crypto.randomUUID(),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    isOnline: () => navigator.onLine,
    onOnline(listener) {
      window.addEventListener('online', listener);
      return () => window.removeEventListener('online', listener);
    },
  };
}
