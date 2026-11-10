import type { ProcessedImage, WorkerFailure } from './image.worker';
import type { PendingStore } from './pendingUploads';

// Keeps uploading while the traveller moves on. Per photo: process in the worker (EXIF read,
// re-encode without EXIF), upload thumb + display, and only when every photo's views are up,
// the large export JPEG. Pauses while offline; anything unfinished waits in the pending store.

const MAX_PARALLEL = 3;
export const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export type PickedPhoto = Pick<ProcessedImage, 'width' | 'height' | 'takenAt' | 'gps'> & { id: string };
export type UploadFailure = WorkerFailure | 'upload_failed';

export type UploadDeps = {
  process: (file: File) => Promise<ProcessedImage>;
  uploadViews: (photoId: string, image: Pick<ProcessedImage, 'thumb' | 'display'>) => Promise<void>;
  uploadExport: (photoId: string, file: Blob) => Promise<void>;
  store: PendingStore;
  createId: () => string;
  wait: (ms: number) => Promise<void>;
  isOnline: () => boolean;
  onOnline: (listener: () => void) => () => void;
};

export type UploadCallbacks = {
  onStart: (uploadId: string, fileName: string) => void;
  /** Metadata is ready: arranging can start before the upload finishes. */
  onProcessed: (uploadId: string, photo: PickedPhoto) => void;
  /** Thumb and display are stored: the photo can join the draft. */
  onUploaded: (uploadId: string, photoId: string) => void;
  onFailed: (uploadId: string, reason: UploadFailure) => void;
};

type Job = { uploadId: string; file?: File; photoId?: string; image?: Omit<ProcessedImage, 'gps'> };

export function createUploadQueue(tripKey: string, deps: UploadDeps, callbacks: UploadCallbacks) {
  const waiting: Job[] = [];
  const failed = new Map<string, Job>();
  const exports: { photoId: string; file: Blob }[] = [];
  let running = 0;
  let exporting = false;

  async function whenOnline() {
    if (deps.isOnline()) return;
    await new Promise<void>((resolve) => {
      const stop = deps.onOnline(() => {
        stop();
        resolve();
      });
    });
  }

  async function withRetries(step: () => Promise<void>) {
    for (let attempt = 1; ; attempt++) {
      await whenOnline();
      try {
        return await step();
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS) throw error;
        await deps.wait(RETRY_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  async function runJob(job: Job) {
    let image = job.image;
    let photoId = job.photoId;
    if (!image || !photoId) {
      try {
        const processed = await deps.process(job.file as File); // a job without an image always has a file
        photoId = deps.createId();
        const { gps, ...stored } = processed;
        image = stored;
        callbacks.onProcessed(job.uploadId, { id: photoId, width: image.width, height: image.height, takenAt: image.takenAt, gps });
        await deps.store.save({ tripKey, photoId, image, viewsUploaded: false }).catch(() => undefined);
      } catch (error) {
        callbacks.onFailed(job.uploadId, isWorkerFailure(error) ? error : 'unreadable');
        return;
      }
    }

    const ready = { ...job, photoId, image };
    try {
      await withRetries(() => deps.uploadViews(photoId, image));
    } catch {
      failed.set(job.uploadId, ready);
      callbacks.onFailed(job.uploadId, 'upload_failed');
      return;
    }
    await deps.store.save({ tripKey, photoId, image, viewsUploaded: true }).catch(() => undefined);
    callbacks.onUploaded(job.uploadId, photoId);
    exports.push({ photoId, file: image.export });
  }

  async function runExports() {
    if (exporting || running > 0 || waiting.length > 0) return;
    exporting = true;
    for (let next = exports.shift(); next; next = exports.shift()) {
      const { photoId, file } = next;
      // An export that keeps failing stays pending and is retried on the next visit.
      const done = await withRetries(() => deps.uploadExport(photoId, file)).then(
        () => true,
        () => false,
      );
      if (done) await deps.store.remove(tripKey, photoId).catch(() => undefined);
    }
    exporting = false;
  }

  function startNext() {
    while (running < MAX_PARALLEL) {
      const job = waiting.shift();
      if (!job) break;
      running += 1;
      void runJob(job).finally(() => {
        running -= 1;
        startNext();
      });
    }
    void runExports();
  }

  return {
    add(files: File[]) {
      for (const file of files) {
        const uploadId = deps.createId();
        callbacks.onStart(uploadId, file.name);
        waiting.push({ uploadId, file });
      }
      startNext();
    },
    /** "Retry" on a failed photo: its processed image is reused, nothing is re-encoded. */
    retry(uploadId: string) {
      const job = failed.get(uploadId);
      if (!job) return;
      failed.delete(uploadId);
      waiting.push(job);
      startNext();
    },
    /** "Remove" on a failed photo. */
    async remove(uploadId: string) {
      const job = failed.get(uploadId);
      failed.delete(uploadId);
      if (job?.photoId) await deps.store.remove(tripKey, job.photoId).catch(() => undefined);
    },
    /** Picks up photos left from an earlier visit. Returns how many were waiting. */
    async resume(): Promise<number> {
      const pending = await deps.store.list(tripKey).catch(() => []);
      for (const photo of pending) {
        if (photo.viewsUploaded) exports.push({ photoId: photo.photoId, file: photo.image.export });
        else waiting.push({ uploadId: photo.photoId, photoId: photo.photoId, image: photo.image });
      }
      startNext();
      return pending.length;
    },
  };
}

function isWorkerFailure(value: unknown): value is WorkerFailure {
  return value === 'heic_unsupported' || value === 'unreadable';
}
