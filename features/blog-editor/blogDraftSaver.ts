import type { BlogDocument } from '@/lib/blog/schema';
import type { BlogDraftStore } from './blogDraftStore';
import {
  forgetNewBlogKey,
  rememberNewBlogKey,
  removeLocalDraft,
  writeLocalDraft,
  type LocalStorageLike,
} from './localDraft';
import { hasContent } from './postRules';

// Autosave for the blog composer (spec §3.2), copied from the Quest saver: one save at a time,
// each based on the saved_at the last one returned, so a tab never conflicts with itself. A save
// from another tab or device makes the next one fail with `conflict` (decision 0001 rule 4).
//
// When: 2 s after the last change, at least every 10 s while typing doesn't stop, straight away
// when the page is hidden or closed, every 5 s after a failure, and on `online` after being offline.

export const DEBOUNCE_MS = 2_000;
export const MAX_WAIT_MS = 10_000;
export const RETRY_MS = 5_000;
export const LOCAL_WRITE_MS = 500;

type SaveInput = { key: string; basedOn: string | null; document: BlogDocument };
type SaveData =
  | { saved: true; savedAt: string; created: boolean }
  | { saved: false; error: 'conflict' | 'not_found' | 'too_many_photos' | 'too_long' | 'no_access' | 'exists' };
/** What saveBlogDraft returns (`action()`'s typed result). */
export type SaveResult = { ok: true; data: SaveData } | { ok: false; error: string };

export type SaverDeps = {
  store: BlogDraftStore;
  save: (input: SaveInput) => Promise<SaveResult>;
  isOnline: () => boolean;
  storage: LocalStorageLike | null;
  /** The first save made the rows: /blogs/new becomes /blogs/{key}/edit. */
  onCreated?: () => void;
  /** The save can't go on here: the key already has rows, or the writer has no access. */
  onStopped?: (reason: 'exists' | 'no_access') => void;
};

export type SaveOutcome =
  | 'saved'
  | 'unchanged'
  | 'conflict'
  | 'offline'
  | 'failed'
  | 'not_found'
  | 'no_access'
  /** The key already has rows (a first save whose answer never arrived): open it from the server. */
  | 'exists';

export function createBlogDraftSaver({ store, save, isOnline, storage, onCreated, onStopped }: SaverDeps) {
  let running: Promise<SaveOutcome> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let localTimer: ReturnType<typeof setTimeout> | undefined;
  /** Left the composer: one last save, but no retries from a screen that's gone. */
  let leaving = false;
  /** The empty blog was discarded: nothing more is saved or kept. */
  let abandoned = false;

  function clearSaveTimers() {
    clearTimeout(debounceTimer);
    clearTimeout(maxWaitTimer);
    clearTimeout(retryTimer);
    debounceTimer = maxWaitTimer = retryTimer = undefined;
  }

  function writeLocalNow() {
    clearTimeout(localTimer);
    localTimer = undefined;
    if (abandoned) return;
    const { key, ownerKey, draftSavedAt, document, version, savedVersion } = store.getState();
    if (version === savedVersion) return;
    if (draftSavedAt === null) rememberNewBlogKey(storage, key, ownerKey);
    writeLocalDraft(storage, key, { userId: ownerKey, basedOn: draftSavedAt, document, version });
  }

  async function runSave(force: boolean): Promise<SaveOutcome> {
    if (abandoned) return 'unchanged';
    const state = store.getState();
    const { key, draftSavedAt, document, version, savedVersion } = state;
    if (state.saveStatus === 'conflict') return 'conflict';
    if (state.lost) return 'not_found';
    const created = draftSavedAt !== null;
    if (created && version === savedVersion) return 'unchanged';
    // The rows are made by the first save with content, so an empty composer leaves nothing behind.
    if (!created && !force && !hasContent(document)) return 'unchanged';
    if (!isOnline()) {
      state.setSaveStatus('offline');
      return 'offline';
    }

    state.setSaveStatus('saving');
    const result = await save({ key, basedOn: draftSavedAt, document }).catch(() => null);
    const after = store.getState();
    const data = result?.ok ? result.data : null;
    if (data?.saved) {
      after.markSaved(data.savedAt, version, data.created);
      if (data.created) {
        forgetNewBlogKey(storage, key, state.ownerKey);
        onCreated?.();
      }
      // Newer typing keeps its copy, now based on this save.
      if (after.version > version) writeLocalNow();
      else removeLocalDraft(storage, key, { userId: state.ownerKey, version });
      return 'saved';
    }
    const error = data && !data.saved ? data.error : null;
    if (error === 'conflict') {
      clearSaveTimers();
      after.setSaveStatus('conflict');
      return 'conflict';
    }
    if (error === 'not_found') {
      clearSaveTimers();
      after.setLost();
      after.setSaveStatus('saved');
      return 'not_found';
    }
    if (error === 'no_access' || error === 'exists') {
      clearSaveTimers();
      after.setSaveStatus('saved');
      onStopped?.(error);
      return error;
    }
    after.setSaveStatus(isOnline() ? 'retrying' : 'offline');
    if (isOnline()) scheduleRetry();
    return isOnline() ? 'failed' : 'offline';
  }

  function scheduleRetry() {
    if (leaving || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void saveNow();
    }, RETRY_MS);
  }

  /** Saves now if something changed. `force` creates the rows even for an empty composer. */
  async function saveNow({ force = false }: { force?: boolean } = {}): Promise<SaveOutcome> {
    while (running) await running.catch(() => undefined);
    clearSaveTimers();
    running = runSave(force);
    try {
      return await running;
    } finally {
      running = null;
    }
  }

  return {
    saveNow,

    /** Call after every change to the document. */
    changed() {
      leaving = false;
      localTimer ??= setTimeout(writeLocalNow, LOCAL_WRITE_MS);
      const { saveStatus } = store.getState();
      if (saveStatus === 'conflict') return;
      if (!isOnline()) {
        store.getState().setSaveStatus('offline');
        return;
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void saveNow(), DEBOUNCE_MS);
      maxWaitTimer ??= setTimeout(() => void saveNow(), MAX_WAIT_MS);
    },

    /** The page is hidden or closing: keep the copy and save straight away. */
    hidden() {
      writeLocalNow();
      void saveNow();
    },

    online() {
      const state = store.getState();
      if (state.saveStatus === 'offline') state.setSaveStatus(state.version === state.savedVersion ? 'saved' : 'saving');
      void saveNow();
    },

    offline() {
      const state = store.getState();
      if (state.saveStatus !== 'conflict' && state.version !== state.savedVersion) state.setSaveStatus('offline');
    },

    /** Leaving the composer: the latest text is kept on this device and saved once more. */
    stop() {
      leaving = true;
      clearSaveTimers();
      if (localTimer) writeLocalNow();
      void saveNow();
    },

    /** Close on an empty blog: its rows are being discarded, so nothing is saved after this. */
    abandon() {
      abandoned = true;
      clearSaveTimers();
      clearTimeout(localTimer);
      localTimer = undefined;
    },

    /** Back on the composer (effects run twice in development). */
    resume() {
      leaving = false;
    },
  };
}

export type BlogDraftSaver = ReturnType<typeof createBlogDraftSaver>;
