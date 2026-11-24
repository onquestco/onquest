import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlogDraftSaver, DEBOUNCE_MS, MAX_WAIT_MS, RETRY_MS, type SaveResult } from './blogDraftSaver';
import { createBlogDraftStore, type InitialBlogDraft } from './blogDraftStore';
import { readLocalDraft, readNewBlogKey, type LocalStorageLike } from './localDraft';

const KEY = '11111111-1111-4111-8111-111111111111';

function memoryStorage(): LocalStorageLike {
  const items = new Map<string, string>();
  return {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => void items.set(name, value),
    removeItem: (name) => void items.delete(name),
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
  };
}

function setup(initial: Partial<InitialBlogDraft> = {}) {
  const store = createBlogDraftStore({
    key: KEY,
    photoFolder: `user/${KEY}`,
    draftSavedAt: 's1',
    blogSavedAt: 's1',
    status: 'draft',
    visibility: 'public',
    document: { title: 'Goa on 15k', body: '', photos: [] },
    ...initial,
  });
  const calls: { basedOn: string | null; body: string }[] = [];
  let online = true;
  let nextResult: () => SaveResult = () => ({
    ok: true,
    data: { saved: true, savedAt: `s${calls.length + 1}`, created: calls.at(-1)?.basedOn === null },
  });
  const save = vi.fn(async (input: { basedOn: string | null; document: { body: string } }) => {
    calls.push({ basedOn: input.basedOn, body: input.document.body });
    return nextResult();
  });
  const storage = memoryStorage();
  const onCreated = vi.fn();
  const saver = createBlogDraftSaver({ store, save, isOnline: () => online, storage, onCreated });
  const type = (body: string) => {
    store.getState().change({ body });
    saver.changed();
  };
  return {
    store,
    saver,
    save,
    calls,
    storage,
    onCreated,
    type,
    setOnline: (value: boolean) => (online = value),
    willReturn: (result: () => SaveResult) => (nextResult = result),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('blogDraftSaver', () => {
  it('saves 2 s after the last change, once', async () => {
    const { type, save, calls, store } = setup();
    type('W');
    type('We');
    type('We stayed');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual([{ basedOn: 's1', body: 'We stayed' }]);
    expect(store.getState().saveStatus).toBe('saved');
    expect(store.getState().draftSavedAt).toBe('s2');
  });

  it('saves at least every 10 s while typing never stops', async () => {
    const { type, save } = setup();
    for (let elapsed = 0; elapsed < MAX_WAIT_MS; elapsed += 1_000) {
      type(`text ${elapsed}`);
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('bases each save on the saved_at the last one returned', async () => {
    const { type, calls } = setup();
    type('one');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    type('two');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(calls.map((call) => call.basedOn)).toEqual(['s1', 's2']);
  });

  it('saves straight away when the page is hidden', async () => {
    const { type, saver, save } = setup();
    type('closing the app mid-sentence');
    saver.hidden();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('offline: keeps the text locally, says so, and saves when back online', async () => {
    const { type, saver, save, store, storage, setOnline } = setup();
    setOnline(false);
    type('typing on the train');
    expect(store.getState().saveStatus).toBe('offline');
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS * 2);
    expect(save).not.toHaveBeenCalled();
    expect(readLocalDraft(storage, KEY)?.document.body).toBe('typing on the train');

    setOnline(true);
    saver.online();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.getState().saveStatus).toBe('saved');
    expect(readLocalDraft(storage, KEY)).toBeNull();
  });

  it('retries every 5 s after a failure', async () => {
    const { type, save, store, willReturn } = setup();
    willReturn(() => ({ ok: false, error: 'Something went wrong' }));
    type('text');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.getState().saveStatus).toBe('retrying');
    willReturn(() => ({ ok: true, data: { saved: true, savedAt: 's9', created: false } }));
    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(save).toHaveBeenCalledTimes(2);
    expect(store.getState().saveStatus).toBe('saved');
  });

  it('a conflict stops autosaving (two tabs)', async () => {
    const { type, save, store, willReturn } = setup();
    willReturn(() => ({ ok: true, data: { saved: false, error: 'conflict' } }));
    type('tab B');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.getState().saveStatus).toBe('conflict');
    type('more in tab B');
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS * 2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('keeps a newer local copy, based on the save that just finished', async () => {
    const { type, store, storage, save } = setup();
    let finish: (result: SaveResult) => void = () => undefined;
    save.mockImplementationOnce(() => new Promise<SaveResult>((resolve) => (finish = resolve)));
    type('first');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    type('first and second');
    finish({ ok: true, data: { saved: true, savedAt: 's2', created: false } });
    await vi.advanceTimersByTimeAsync(0);
    expect(readLocalDraft(storage, KEY)).toMatchObject({ basedOn: 's2', document: { body: 'first and second' } });
    expect(store.getState().version).toBeGreaterThan(store.getState().savedVersion);
  });

  describe('a new blog', () => {
    const fresh = { draftSavedAt: null, blogSavedAt: null, document: { body: '', photos: [] } };

    it('creates nothing while the composer is empty', async () => {
      const { saver, save } = setup(fresh);
      expect(await saver.saveNow()).toBe('unchanged');
      expect(save).not.toHaveBeenCalled();
    });

    it('the first save with content creates it (basedOn null) and remembers it until then', async () => {
      const { type, calls, store, storage, onCreated } = setup(fresh);
      type('Goa');
      await vi.advanceTimersByTimeAsync(500);
      expect(readNewBlogKey(storage)).toBe(KEY);
      expect(readLocalDraft(storage, KEY)?.basedOn).toBeNull();
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      expect(calls[0]?.basedOn).toBeNull();
      expect(store.getState().draftSavedAt).toBe('s2');
      expect(store.getState().blogSavedAt).toBe('s2');
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(readNewBlogKey(storage)).toBeNull();
    });

    it('force creates the rows for an empty composer (place search, Create a Quest)', async () => {
      const { saver, calls } = setup(fresh);
      expect(await saver.saveNow({ force: true })).toBe('saved');
      expect(calls).toHaveLength(1);
    });

    it('a key that already has rows asks the composer to open it from the server', async () => {
      const { type, saver, willReturn } = setup(fresh);
      willReturn(() => ({ ok: true, data: { saved: false, error: 'exists' } }));
      type('Goa');
      expect(await saver.saveNow()).toBe('exists');
    });
  });
});
