'use client';

import { useStore } from 'zustand';
import { Button } from '@/design-system/components/Button';
import { BackIcon, CloseIcon } from '@/design-system/components/icons';
import { ProgressRing } from '@/design-system/components/ProgressRing';
import type { BlogDraftState, BlogDraftStore } from './blogDraftStore';
import type { PostCheck } from './postRules';

/** The muted status next to Close (spec §3.2): nothing until there's something to save. */
export function saveStatusText(state: Pick<BlogDraftState, 'saveStatus' | 'version' | 'savedVersion' | 'draftSavedAt'>) {
  if (state.saveStatus === 'conflict') return null; // the banner says it
  if (state.saveStatus === 'offline') return "Not saved yet. You're offline.";
  if (state.saveStatus === 'retrying') return "Couldn't save. Retrying.";
  if (state.saveStatus === 'saving' || state.version !== state.savedVersion) {
    return state.draftSavedAt === null && state.saveStatus !== 'saving' ? null : 'Saving…';
  }
  return state.draftSavedAt === null ? null : 'Saved';
}

type Props = {
  store: BlogDraftStore;
  check: PostCheck;
  posting: boolean;
  onClose: () => void;
  onPreview: () => void;
  onPost: () => void;
};

/** Close (X), "Saved", Preview and the one orange Post (PRD B2). In Preview: "Back to edit" and Post. */
export function ComposerTopBar({ store, check, posting, onClose, onPreview, onPost }: Props) {
  const mode = useStore(store, (state) => state.mode);
  const status = useStore(store, saveStatusText);
  const uploading = !check.ok && check.reason === 'uploading';
  const waiting = !check.ok && (check.reason === 'uploading' || check.reason === 'photo_failed');

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-lg items-center gap-1 px-2 py-1">
        {mode === 'preview' ? (
          <button
            type="button"
            onClick={() => store.getState().setMode('edit')}
            className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-label font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            <BackIcon size={20} />
            Back to edit
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            <CloseIcon />
          </button>
        )}
        <p role="status" aria-live="polite" className="min-w-0 flex-1 px-1 text-caption text-ink-muted">
          {status}
        </p>
        {mode === 'edit' && (
          <Button variant="quiet" className="shrink-0" onClick={onPreview}>
            Preview
          </Button>
        )}
        <Button
          className="shrink-0 px-5"
          disabled={waiting || posting}
          onClick={onPost}
          aria-label={uploading ? 'Post (waiting for photos to upload)' : undefined}
        >
          {uploading && <ProgressRing progress={0.5} label="Photos uploading" size={18} />}
          {posting ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </header>
  );
}
