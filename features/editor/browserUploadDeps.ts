import { uploadPhotoExport, uploadPhotoViews } from '@/lib/storage';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import type { ProcessedImage, WorkerRequest, WorkerResponse } from './image.worker';
import { indexedDbStore } from './pendingUploads';
import type { UploadDeps } from './upload';

// The real browser pieces behind the upload queue: one image worker, Supabase Storage, IndexedDB.

// One worker, one photo at a time: decoding several large photos at once runs phones out of memory.
let worker: Worker | undefined;
let lastProcessing: Promise<unknown> = Promise.resolve();

function runWorker(file: File): Promise<ProcessedImage> {
  worker ??= new Worker(new URL('./image.worker.ts', import.meta.url));
  const activeWorker = worker;

  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const onMessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.requestId !== requestId) return;
      activeWorker.removeEventListener('message', onMessage);
      if (data.ok) resolve(data.image);
      else reject(data.reason);
    };
    activeWorker.addEventListener('message', onMessage);
    const request: WorkerRequest = { requestId, file };
    activeWorker.postMessage(request);
  });
}

export function processInTurn(file: File): Promise<ProcessedImage> {
  const result = lastProcessing.then(() => runWorker(file));
  lastProcessing = result.catch(() => undefined);
  return result;
}

/** `folder` is "{userId}/{tripKey}", the storage folder for this Quest's photos. */
export function browserUploadDeps(folder: string): UploadDeps {
  const supabase = createBrowserSupabase();
  return {
    process: processInTurn,
    uploadViews: (photoId, image) => uploadPhotoViews(supabase, folder, photoId, image),
    uploadExport: (photoId, file) => uploadPhotoExport(supabase, folder, photoId, file),
    store: indexedDbStore,
    createId: () => crypto.randomUUID(),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    isOnline: () => navigator.onLine,
    onOnline(listener) {
      window.addEventListener('online', listener);
      return () => window.removeEventListener('online', listener);
    },
  };
}
