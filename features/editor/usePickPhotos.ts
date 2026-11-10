'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_PHOTOS } from '@/lib/trip/limits';
import { createUploadQueue, type PickedPhoto, type UploadDeps, type UploadFailure } from './upload';

export type TileStatus = 'processing' | 'uploading' | 'done' | 'failed';
export type Tile = {
  uploadId: string;
  name: string;
  /** Object URL of the picked file, for the tile. Browsers that can't show HEIC show a blank tile. */
  previewUrl: string;
  status: TileStatus;
  failure?: UploadFailure;
  photo?: PickedPhoto;
};

export const LIMIT_MESSAGE = `A Quest holds ${MAX_PHOTOS} photos. Remove one to add another.`;

/** The picked photos and their upload state, for the Pick photos screen. */
export function usePickPhotos(tripKey: string, deps: () => UploadDeps) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [message, setMessage] = useState<string>();
  const [online, setOnline] = useState(true);

  const patch = useCallback(
    (uploadId: string, change: Partial<Tile>) =>
      setTiles((current) => current.map((tile) => (tile.uploadId === uploadId ? { ...tile, ...change } : tile))),
    [],
  );

  const queueRef = useRef<ReturnType<typeof createUploadQueue>>(null);
  const queue = () => {
    queueRef.current ??= createUploadQueue(tripKey, deps(), {
      onStart: (uploadId, file) =>
        setTiles((current) => [
          ...current,
          { uploadId, name: file.name, previewUrl: URL.createObjectURL(file), status: 'processing' },
        ]),
      onProcessed: (uploadId, photo) => patch(uploadId, { status: 'uploading', photo }),
      onUploaded: (uploadId) => patch(uploadId, { status: 'done', failure: undefined }),
      onFailed: (uploadId, failure) => patch(uploadId, { status: 'failed', failure }),
    });
    return queueRef.current;
  };

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  function add(files: File[]) {
    const room = MAX_PHOTOS - tiles.length;
    if (files.length > room) setMessage(LIMIT_MESSAGE);
    if (room > 0) queue().add(files.slice(0, room));
  }

  function retry(uploadId: string) {
    patch(uploadId, { status: 'uploading', failure: undefined });
    queue().retry(uploadId);
  }

  function remove(uploadId: string) {
    void queue().remove(uploadId);
    setTiles((current) =>
      current.filter((tile) => {
        if (tile.uploadId === uploadId) URL.revokeObjectURL(tile.previewUrl);
        return tile.uploadId !== uploadId;
      }),
    );
  }

  return { tiles, add, retry, remove, online, message, clearMessage: () => setMessage(undefined) };
}
