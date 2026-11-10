import { describe, expect, it } from 'vitest';
import type { ProcessedImage } from './image.worker';
import { memoryStore } from './pendingUploads';
import { createUploadQueue, MAX_ATTEMPTS, type UploadDeps } from './upload';

const blob = (name: string) => new Blob([name], { type: 'image/webp' });
const image = (): ProcessedImage => ({
  thumb: blob('thumb'),
  display: blob('display'),
  export: blob('export'),
  width: 1600,
  height: 1200,
  takenAt: '2026-02-12T09:00:00.000Z',
  gps: { lat: 15.49, lng: 73.82 },
});
const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(overrides: Partial<UploadDeps> = {}) {
  const log: string[] = [];
  let next = 0;
  let online = true;
  const listeners = new Set<() => void>();
  const store = memoryStore();
  const deps: UploadDeps = {
    process: async () => image(),
    uploadViews: async (photoId) => void log.push(`views ${photoId}`),
    uploadExport: async (photoId) => void log.push(`export ${photoId}`),
    store,
    createId: () => `id-${++next}`,
    wait: async () => undefined,
    isOnline: () => online,
    onOnline: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ...overrides,
  };
  const events: string[] = [];
  const queue = createUploadQueue('trip', deps, {
    onStart: (uploadId) => events.push(`start ${uploadId}`),
    onProcessed: (uploadId, photo) => events.push(`processed ${uploadId} gps=${Boolean(photo.gps)}`),
    onUploaded: (uploadId, photoId) => events.push(`uploaded ${photoId}`),
    onFailed: (uploadId, reason) => events.push(`failed ${uploadId} ${reason}`),
  });
  const goOnline = () => {
    online = true;
    for (const listener of [...listeners]) listener();
  };
  return { queue, log, events, store, goOffline: () => (online = false), goOnline };
}

describe('upload queue', () => {
  it("uploads every photo's thumb and display before any export", async () => {
    const { queue, log } = setup();
    queue.add([file('a.jpg'), file('b.jpg')]);
    for (let i = 0; i < 10; i++) await settle();
    const firstExport = log.findIndex((line) => line.startsWith('export'));
    expect(log.slice(0, firstExport).every((line) => line.startsWith('views'))).toBe(true);
    expect(log.filter((line) => line.startsWith('export'))).toHaveLength(2);
  });

  it('hands GPS to the page but never stores it', async () => {
    const { queue, events, store } = setup({ uploadExport: async () => Promise.reject(new Error('down')) });
    queue.add([file('a.jpg')]);
    for (let i = 0; i < 10; i++) await settle();
    expect(events).toContain('processed id-1 gps=true');
    const [pending] = await store.list('trip');
    expect(pending && 'gps' in pending.image).toBe(false);
  });

  it('gives up after the last attempt and can retry without re-encoding', async () => {
    let calls = 0;
    let processed = 0;
    const { queue, events } = setup({
      process: async () => (processed++, image()),
      uploadViews: async () => {
        calls++;
        if (calls <= MAX_ATTEMPTS) throw new Error('down');
      },
    });
    queue.add([file('a.jpg')]);
    for (let i = 0; i < 10; i++) await settle();
    expect(events).toContain('failed id-1 upload_failed');
    queue.retry('id-1');
    for (let i = 0; i < 10; i++) await settle();
    expect(events.at(-1)).toBe('uploaded id-2');
    expect(processed).toBe(1);
  });

  it('waits while offline and carries on when the connection is back', async () => {
    const { queue, log, goOffline, goOnline } = setup();
    goOffline();
    queue.add([file('a.jpg')]);
    for (let i = 0; i < 5; i++) await settle();
    expect(log).toEqual([]);
    goOnline();
    for (let i = 0; i < 10; i++) await settle();
    expect(log).toEqual(['views id-2', 'export id-2']);
  });

  it('reports a HEIC the browser cannot open', async () => {
    const { queue, events } = setup({ process: () => Promise.reject('heic_unsupported') });
    queue.add([file('a.heic')]);
    for (let i = 0; i < 5; i++) await settle();
    expect(events).toContain('failed id-1 heic_unsupported');
  });

  it('resumes photos left from an earlier visit', async () => {
    const first = setup({ uploadExport: async () => Promise.reject(new Error('closed tab')) });
    first.queue.add([file('a.jpg')]);
    for (let i = 0; i < 10; i++) await settle();

    const log: string[] = [];
    const again = createUploadQueue(
      'trip',
      {
        process: async () => image(),
        uploadViews: async (photoId) => void log.push(`views ${photoId}`),
        uploadExport: async (photoId) => void log.push(`export ${photoId}`),
        store: first.store,
        createId: () => 'new',
        wait: async () => undefined,
        isOnline: () => true,
        onOnline: () => () => undefined,
      },
      {
        onStart: () => undefined,
        onProcessed: () => undefined,
        onUploaded: () => undefined,
        onFailed: () => undefined,
      },
    );
    expect(await again.resume()).toBe(1);
    for (let i = 0; i < 10; i++) await settle();
    expect(log).toEqual(['export id-2']);
    expect(await first.store.list('trip')).toEqual([]);
  });
});
