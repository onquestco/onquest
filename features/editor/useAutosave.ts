'use client';

import { useEffect } from 'react';
import { saveDraftNow } from './draftSaver';
import { useDraft } from './draftStore';

const DEBOUNCE_MS = 1500;
const RETRY_MS = 5000;

/**
 * Saves the draft 1.5 s after the last change (spec A §6), retries every 5 s after a failure, and
 * tries once more when the page is hidden (tab switched, app backgrounded).
 */
export function useAutosave() {
  const version = useDraft((state) => state.version);
  const saveStatus = useDraft((state) => state.saveStatus);

  useEffect(() => {
    if (saveStatus === 'conflict') return;
    const wait = saveStatus === 'retrying' ? RETRY_MS : DEBOUNCE_MS;
    const timer = setTimeout(() => void saveDraftNow(), wait);
    return () => clearTimeout(timer);
  }, [version, saveStatus]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void saveDraftNow();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);
}
