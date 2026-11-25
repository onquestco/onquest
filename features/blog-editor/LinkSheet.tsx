'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { TextField } from '@/design-system/components/TextField';
import { cleanHref, LINK_ERROR } from './linkCommands';

// Link (⌘/Ctrl+K, spec §6.1): an address and the words to show. Only http(s) links are accepted,
// as the blog page links nothing else. With the cursor in a link, it opens filled in and can
// remove the link, keeping its text.

type Props = {
  /** The link being edited, or the selected text for a new one. */
  initial: { text: string; href: string };
  editing: boolean;
  onSave: (link: { text: string; href: string }) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function LinkSheet({ initial, editing, onSave, onRemove, onClose }: Props) {
  const [href, setHref] = useState(initial.href);
  const [text, setText] = useState(initial.text);
  const [error, setError] = useState<string>();

  function save() {
    const clean = cleanHref(href);
    if (!clean) return setError(LINK_ERROR);
    onSave({ text, href: clean });
  }

  return (
    <Sheet open title={editing ? 'Edit link' : 'Add a link'} onClose={onClose}>
      <form
        // Our own message instead of the browser's: it says which links work.
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label="Link"
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://"
          autoFocus
          value={href}
          error={error}
          onChange={(event) => {
            setHref(event.target.value);
            setError(undefined);
          }}
        />
        <TextField label="Text" value={text} onChange={(event) => setText(event.target.value)} />
        <Button type="submit" block>
          {editing ? 'Save link' : 'Add link'}
        </Button>
        {editing && (
          <Button variant="secondary" block onClick={onRemove}>
            Remove link
          </Button>
        )}
      </form>
    </Sheet>
  );
}
