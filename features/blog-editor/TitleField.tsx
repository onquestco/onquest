'use client';

import { useId } from 'react';
import { useStore } from 'zustand';
import { TextArea } from '@/design-system/components/TextField';
import type { BlogDraftStore } from './blogDraftStore';
import { FormatToolbar } from './FormatToolbar';
import { LinkSheet } from './LinkSheet';
import { bodyCounter, cutTitle, titleCounter } from './textLimits';
import { useBodyFormatting } from './useBodyFormatting';

/** The title: large type, the cursor starts here (PRD B1), up to 100 characters with a counter from 80. */
export function TitleField({ store }: { store: BlogDraftStore }) {
  const title = useStore(store, (state) => state.document.title ?? '');
  return (
    <TextArea
      label="Title"
      bare
      size="title"
      rows={1}
      placeholder="Title"
      // A new blog opens with the cursor here; iOS may still wait for a tap to show the keyboard (R5).
      autoFocus={title === ''}
      enterKeyHint="next"
      value={title}
      counter={titleCounter(title)}
      onChange={(event) => store.getState().change({ title: cutTitle(event.target.value) })}
    />
  );
}

/**
 * The story, up to 10,000 characters, with the formatting toolbar above it (blogs-editor spec §6.1).
 * The toolbar sticks under the top bar while the text (or the toolbar) has focus.
 */
export function BodyField({ store, onToast }: { store: BlogDraftStore; onToast: (message: string) => void }) {
  const id = useId();
  const formatting = useBodyFormatting(store, id, onToast);
  return (
    <div className="group flex flex-col gap-2">
      <FormatToolbar
        active={formatting.active}
        canUndo={formatting.canUndo}
        canRedo={formatting.canRedo}
        onCommand={formatting.run}
      />
      <TextArea
        id={id}
        label="Text"
        bare
        rows={6}
        placeholder="Tell the story, share tips, what you'd do again…"
        value={formatting.body}
        counter={bodyCounter(formatting.body)}
        onChange={formatting.onChange}
        onSelect={formatting.onSelect}
        onKeyDown={formatting.onKeyDown}
      />
      {formatting.linkSheet && (
        <LinkSheet
          initial={formatting.linkSheet.initial}
          editing={formatting.linkSheet.editing}
          onSave={formatting.saveLink}
          onRemove={formatting.removeLink}
          onClose={formatting.cancelLink}
        />
      )}
    </div>
  );
}
