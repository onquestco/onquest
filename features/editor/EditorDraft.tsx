'use client';

import { useEffect, type ReactNode } from 'react';
import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { browserUploadDeps } from './browserUploadDeps';
import { useDraft, type LoadedDraft } from './draftStore';
import { createUploadQueue } from './upload';
import { useAutosave } from './useAutosave';

// Wraps every editor screen after Arranging. Loads the draft from the server when this device
// doesn't already hold it (a reload, "Edit Quest", another device), autosaves, finishes uploads
// left from an earlier visit, and shows the conflict dialog.

const resumedUploads = new Set<string>();

function resumeUploads(key: string, folder: string) {
  if (resumedUploads.has(key)) return;
  resumedUploads.add(key);
  const noop = () => {};
  void createUploadQueue(key, browserUploadDeps(folder), {
    onStart: noop,
    onProcessed: noop,
    onUploaded: noop,
    onFailed: noop,
  }).resume();
}

/**
 * Puts the server's draft in the store if this device doesn't hold it yet. In the browser only:
 * the store is one per page load, and on the server it would be shared by every request. Until
 * then the screen shows nothing (the same on the server and the first browser render).
 */
function useLoadDraft(initial: LoadedDraft): boolean {
  const ready = useDraft((state) => state.key === initial.key && state.document !== undefined);
  useEffect(() => {
    const state = useDraft.getState();
    if (state.key !== initial.key || !state.document) state.load(initial);
    // Started on this device: only the server knows the seed and the default visibility.
    else if (state.seed === undefined) {
      useDraft.setState({ seed: initial.seed, visibility: initial.visibility });
    }
    resumeUploads(initial.key, initial.photoFolder);
  }, [initial]);
  return ready;
}

export function EditorDraft({ initial, children }: { initial: LoadedDraft; children: ReactNode }) {
  const ready = useLoadDraft(initial);
  useAutosave();
  const saveStatus = useDraft((state) => state.saveStatus);

  return (
    <>
      {ready ? children : <main className="min-h-svh bg-surface-page" aria-busy />}
      <Sheet
        open={saveStatus === 'conflict'}
        title="This Quest changed on another device"
        onClose={() => window.location.reload()}
      >
        <p className="text-body text-ink-muted">
          It was saved somewhere else after you opened it here. Load the latest version to keep editing.
          Changes made here since then won&apos;t be kept.
        </p>
        <Button block onClick={() => window.location.reload()}>
          Load the latest
        </Button>
      </Sheet>
    </>
  );
}

/** "Saved", "Saving…", "Couldn't save. Retrying." under the Review screen's title (spec A §6). */
export function SaveStatusLine() {
  const saveStatus = useDraft((state) => state.saveStatus);
  const unsaved = useDraft((state) => state.version !== state.savedVersion);
  const text =
    saveStatus === 'retrying'
      ? "Couldn't save. Retrying."
      : saveStatus === 'saving' || unsaved
        ? 'Saving…'
        : 'Saved';
  return (
    <p role="status" aria-live="polite" className="text-caption text-ink-muted">
      {text}
    </p>
  );
}
