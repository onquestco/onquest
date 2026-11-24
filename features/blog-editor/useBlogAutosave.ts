'use client';

import { useEffect, useRef, useState } from 'react';
import { saveBlogDraft } from './actions';
import { createBlogDraftSaver, type BlogDraftSaver } from './blogDraftSaver';
import type { BlogDraftStore } from './blogDraftStore';
import { browserStorage, chooseStartingDraft, readLocalDraft, removeLocalDraft } from './localDraft';

/**
 * Wires the saver to the page: every change, the page being hidden or closed, and the connection
 * coming and going. On open, unsaved work from this device is restored (spec §3.2).
 */
export function useBlogAutosave(store: BlogDraftStore): BlogDraftSaver {
  const [saver] = useState(() =>
    createBlogDraftSaver({
      store,
      save: (input) => saveBlogDraft(input),
      isOnline: () => navigator.onLine,
      storage: browserStorage(),
      // /blogs/new becomes the draft's own address without leaving the page, so the keyboard and
      // the cursor stay where they are.
      onCreated: () => window.history.replaceState(null, '', `/blogs/${store.getState().key}/edit`),
      // A first save whose answer never arrived made the rows already: open them from the server,
      // which restores this device's newer text. Without access, back to the chooser.
      onStopped: (reason) =>
        window.location.replace(reason === 'exists' ? `/blogs/${store.getState().key}/edit` : '/create'),
    }),
  );
  const checkedLocal = useRef(false);

  useEffect(() => {
    // Once per composer (effects run twice in development).
    if (checkedLocal.current) return;
    checkedLocal.current = true;
    const storage = browserStorage();
    const state = store.getState();
    if (state.draftSavedAt === null || state.blogSavedAt === null) return;
    const start = chooseStartingDraft(
      { draftSavedAt: state.draftSavedAt, blogSavedAt: state.blogSavedAt, document: state.document },
      readLocalDraft(storage, state.key, state.ownerKey),
    );
    if (start.dropLocal) removeLocalDraft(storage, state.key);
    if (start.restored) {
      state.change(start.document);
      void saver.saveNow();
    }
  }, [store, saver]);

  useEffect(() => {
    saver.resume();
    const unsubscribe = store.subscribe((next, previous) => {
      if (next.version !== previous.version) saver.changed();
    });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saver.hidden();
    };
    const onHide = () => saver.hidden();
    const onOnline = () => saver.online();
    const onOffline = () => saver.offline();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (!navigator.onLine) saver.offline();
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      saver.stop();
    };
  }, [store, saver]);

  return saver;
}
