'use client';

import { useStore } from 'zustand';
import { TextArea } from '@/design-system/components/TextField';
import type { BlogDraftStore } from './blogDraftStore';
import { bodyCounter, cutBody, cutTitle, titleCounter } from './textLimits';

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

/** The story: plain text, paragraphs and line breaks kept, up to 10,000 characters. */
export function BodyField({ store }: { store: BlogDraftStore }) {
  const body = useStore(store, (state) => state.document.body);
  return (
    <TextArea
      label="Text"
      bare
      rows={6}
      placeholder="Tell the story, share tips, what you'd do again…"
      value={body}
      counter={bodyCounter(body)}
      onChange={(event) => store.getState().change({ body: cutBody(event.target.value) })}
    />
  );
}
