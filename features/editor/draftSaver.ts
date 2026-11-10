'use client';

import { saveQuestDraft } from './actions';
import { useDraft } from './draftStore';

export type SaveOutcome = 'saved' | 'unchanged' | 'conflict' | 'failed';

let running: Promise<SaveOutcome> | null = null;

/**
 * Saves the draft now if it changed. One save at a time: each is based on the saved_at the last
 * one returned, so two saves from this tab can never conflict with each other. A save from another
 * tab or device makes this one fail with `conflict` (decision 0001: no silent overwrite).
 */
export async function saveDraftNow(): Promise<SaveOutcome> {
  while (running) await running.catch(() => undefined);
  const state = useDraft.getState();
  const { key, savedAt, document, version, savedVersion } = state;
  if (!key || !savedAt || !document || version === savedVersion) return 'unchanged';
  if (state.saveStatus === 'conflict') return 'conflict';

  state.setSaveStatus('saving');
  running = saveQuestDraft({ key, basedOn: savedAt, document }).then(
    (result): SaveOutcome => {
      if (result.ok && result.data.saved) {
        useDraft.getState().markSaved(result.data.savedAt, version);
        return 'saved';
      }
      if (result.ok && result.data.error === 'conflict') {
        useDraft.getState().setSaveStatus('conflict');
        return 'conflict';
      }
      useDraft.getState().setSaveStatus('retrying');
      return 'failed';
    },
    () => {
      useDraft.getState().setSaveStatus('retrying');
      return 'failed';
    },
  );
  try {
    return await running;
  } finally {
    running = null;
  }
}
