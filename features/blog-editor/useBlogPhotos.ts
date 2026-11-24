'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { browserUploadDeps } from '@/features/editor/browserUploadDeps';
import { indexedDbStore } from '@/features/editor/pendingUploads';
import { createUploadQueue } from '@/features/editor/upload';
import type { BlogDraftStore } from './blogDraftStore';
import { addPhotos, movePhoto, PHOTO_LIMIT_MESSAGE, removePhoto, toBlogPhoto } from './photoRules';

// The composer's photos, through the Quest upload queue (spec §3.4): re-encoded in the worker
// (EXIF and GPS removed), thumb + display uploaded first, then the export JPEG. A photo joins the
// blog when its thumb and display are up. Photos left uploading on an earlier visit carry on.

type Queue = ReturnType<typeof createUploadQueue>;

export function useBlogPhotos(store: BlogDraftStore) {
  const key = useStore(store, (state) => state.key);
  const folder = useStore(store, (state) => state.photoFolder);
  const [message, setMessage] = useState<string>();
  const clearMessage = useCallback(() => setMessage(undefined), []);
  const queueRef = useRef<Queue>(null);

  const queue = useCallback((): Queue => {
    queueRef.current ??= createUploadQueue(key, browserUploadDeps(folder), {
      onStart: (uploadId, file) =>
        store.getState().addPending({ uploadId, state: 'uploading', previewUrl: URL.createObjectURL(file) }),
      // The worker's GPS and capture time stop here (spec §7): only the id and size are kept.
      onProcessed: (uploadId, picked) => store.getState().updatePending(uploadId, { photo: toBlogPhoto(picked) }),
      onUploaded: (uploadId, photoId) => {
        const waiting = store.getState().pending.find((photo) => photo.uploadId === uploadId);
        const photo = waiting?.photo;
        if (photo && photo.id === photoId) store.getState().photoUploaded(uploadId, photo);
      },
      onFailed: (uploadId, failure) => store.getState().updatePending(uploadId, { state: 'failed', failure }),
    });
    return queueRef.current;
  }, [key, folder, store]);

  // Photos processed on an earlier visit but not uploaded yet: shown from their stored thumb and
  // finished now. Ones already in the blog only have their export JPEG left, which needs no tile.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const waiting = await indexedDbStore.list(key).catch(() => []);
      if (cancelled) return;
      const inBlog = new Set(store.getState().document.photos.map((photo) => photo.id));
      for (const item of waiting) {
        if (item.viewsUploaded || inBlog.has(item.photoId)) continue;
        store.getState().addPending({
          uploadId: item.photoId,
          state: 'uploading',
          previewUrl: URL.createObjectURL(item.image.thumb),
          photo: toBlogPhoto({ id: item.photoId, width: item.image.width, height: item.image.height }),
        });
      }
      if (waiting.length > 0) await queue().resume();
    })();
    return () => {
      cancelled = true;
    };
  }, [key, queue, store]);

  function add(files: File[]) {
    const { document, pending } = store.getState();
    const { accepted, refused } = addPhotos(document.photos.length + pending.length, files);
    if (refused) setMessage(PHOTO_LIMIT_MESSAGE);
    if (accepted.length > 0) queue().add(accepted);
  }

  function retry(uploadId: string) {
    store.getState().updatePending(uploadId, { state: 'uploading', failure: undefined });
    queue().retry(uploadId);
  }

  /** A photo still uploading or failed. One that's uploading finishes, but never joins the blog. */
  function removeWaiting(uploadId: string) {
    const photo = store.getState().pending.find((item) => item.uploadId === uploadId);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    void queue().remove(uploadId);
    store.getState().removePending(uploadId);
  }

  /** A photo in the blog. Its files go in the sweep after the next Post. */
  function removeFromBlog(photoId: string) {
    const { document, change } = store.getState();
    change({ photos: removePhoto(document.photos, photoId) });
  }

  function move(from: number, to: number) {
    const { document, change } = store.getState();
    const photos = movePhoto(document.photos, from, to);
    if (photos !== document.photos) change({ photos });
  }

  return { add, retry, removeWaiting, removeFromBlog, move, message, clearMessage };
}
