// Processed photos wait here (IndexedDB, on this device only) until both upload steps finish,
// so a reload, a lost connection or "Continue editing" picks up where it stopped.
// GPS is never stored: it stays in memory for place names during this visit only.

import type { ProcessedImage } from './image.worker';

const DB_NAME = 'onquest-uploads';
const STORE = 'pending';

export type PendingPhoto = {
  tripKey: string;
  photoId: string;
  image: Omit<ProcessedImage, 'gps'>;
  viewsUploaded: boolean;
};

export type PendingStore = {
  save: (photo: PendingPhoto) => Promise<void>;
  list: (tripKey: string) => Promise<PendingPhoto[]>;
  remove: (tripKey: string, photoId: string) => Promise<void>;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: ['tripKey', 'photoId'] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** The real store. Private browsing can refuse IndexedDB: uploads then still work, without resume. */
export const indexedDbStore: PendingStore = {
  save: (photo) => run('readwrite', (store) => store.put(photo)).then(() => undefined),
  list: (tripKey) =>
    run<PendingPhoto[]>('readonly', (store) =>
      store.getAll(IDBKeyRange.bound([tripKey, ''], [tripKey, '￿'])),
    ),
  remove: (tripKey, photoId) => run('readwrite', (store) => store.delete([tripKey, photoId])).then(() => undefined),
};

/** Keeps nothing. Used when IndexedDB isn't available, and in tests. */
export function memoryStore(): PendingStore {
  const photos = new Map<string, PendingPhoto>();
  const id = (tripKey: string, photoId: string) => `${tripKey}/${photoId}`;
  return {
    save: async (photo) => void photos.set(id(photo.tripKey, photo.photoId), photo),
    list: async (tripKey) => [...photos.values()].filter((photo) => photo.tripKey === tripKey),
    remove: async (tripKey, photoId) => void photos.delete(id(tripKey, photoId)),
  };
}
