'use client';

import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import type { BlogDraftStore } from './blogDraftStore';
import {
  activeFormats,
  continueList,
  toggleInline,
  toggleLine,
  TOO_LONG_MESSAGE,
  type CommandResult,
  type Edit,
  type InlineFormat,
  type Selection,
} from './formatCommands';
import type { ToolbarCommand } from './FormatToolbar';
import { applyLink, linkAt, removeLink, type LinkAtCursor } from './linkCommands';
import { cutBody } from './textLimits';
import type { BodyHistory, Snapshot } from './useBodyHistory';

// The body field's formatting (spec §6.1): toolbar commands, shortcuts, list continuation, the
// link sheet and undo/redo, all as edits to the one body string in the draft store. Every edit
// goes through store.change(), so it autosaves like typing.

const INLINE: readonly ToolbarCommand[] = ['bold', 'italic', 'strike', 'code', 'spoiler'];
const isInline = (command: ToolbarCommand): command is InlineFormat => INLINE.includes(command);
const SHORTCUT_KEYS: Partial<Record<string, ToolbarCommand>> = {
  b: 'bold',
  i: 'italic',
  e: 'code',
  k: 'link',
};

export type LinkSheetState = {
  initial: { text: string; href: string };
  existing: LinkAtCursor | null;
  /** Where the link goes: the selection when the sheet opened. */
  selection: Selection;
  editing: boolean;
};

/** The ⌘/Ctrl shortcut for a key press, or null (spec §6.1). */
export function shortcutCommand(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): ToolbarCommand | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'x') return event.shiftKey ? 'strike' : null;
  if (event.shiftKey) return null;
  if (key === 'y' && event.ctrlKey) return 'redo';
  return SHORTCUT_KEYS[key] ?? null;
}

export function useBodyFormatting(
  store: BlogDraftStore,
  history: BodyHistory,
  fieldId: string,
  onToast: (message: string) => void,
) {
  const body = useStore(store, (state) => state.document.body);
  const [selection, setSelection] = useState<Selection>({ start: body.length, end: body.length });
  const [linkSheet, setLinkSheet] = useState<LinkSheetState | null>(null);
  /** Where the cursor goes once React has put the new text in the field. */
  const pendingSelection = useRef<Selection | null>(null);
  const active = useMemo(() => activeFormats(body, selection), [body, selection]);

  useLayoutEffect(() => {
    const next = pendingSelection.current;
    const field = textarea(fieldId);
    if (!next || !field) return;
    pendingSelection.current = null;
    field.setSelectionRange(next.start, next.end);
  });

  const current = (): Snapshot => {
    const field = textarea(fieldId);
    return {
      body: store.getState().document.body,
      selection: field ? { start: field.selectionStart, end: field.selectionEnd } : selection,
    };
  };

  function show(edit: Edit) {
    store.getState().change({ body: edit.body });
    pendingSelection.current = edit.selection;
    setSelection(edit.selection);
  }

  function commit(result: CommandResult, before: Snapshot) {
    if ('error' in result) return onToast(TOO_LONG_MESSAGE);
    if (result.body !== before.body) history.command(before, result);
    show(result);
  }

  function run(command: ToolbarCommand) {
    const before = current();
    if (command === 'undo' || command === 'redo') {
      const snapshot = command === 'undo' ? history.undo() : history.redo();
      if (snapshot) show(snapshot);
    } else if (command === 'link') {
      const existing = linkAt(before.body, before.selection);
      const selected = before.body.slice(before.selection.start, before.selection.end);
      setLinkSheet({
        initial: existing
          ? { text: existing.bracketed ? existing.text : '', href: existing.href }
          : { text: selected, href: '' },
        existing,
        selection: before.selection,
        editing: Boolean(existing?.bracketed),
      });
    } else if (isInline(command)) {
      commit(toggleInline(before.body, before.selection, command), before);
    } else {
      commit(toggleLine(before.body, before.selection, command), before);
    }
  }

  function closeLinkSheet(edit?: (before: Snapshot, sheet: LinkSheetState) => CommandResult) {
    const sheet = linkSheet;
    setLinkSheet(null);
    textarea(fieldId)?.focus();
    if (!sheet || !edit) return;
    const before = { body: store.getState().document.body, selection: sheet.selection };
    commit(edit(before, sheet), before);
  }

  return {
    body,
    active,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    run,
    linkSheet,
    saveLink: (link: { text: string; href: string }) =>
      closeLinkSheet((before, sheet) => applyLink(before.body, sheet.selection, sheet.existing, link)),
    removeLink: () =>
      closeLinkSheet((before, sheet) => (sheet.existing ? removeLink(before.body, sheet.existing) : before)),
    cancelLink: () => closeLinkSheet(),

    onChange(event: ChangeEvent<HTMLTextAreaElement>) {
      const value = cutBody(event.target.value);
      const after = {
        body: value,
        selection: { start: event.target.selectionStart, end: event.target.selectionEnd },
      };
      store.getState().change({ body: value });
      history.typed({ body, selection }, after);
      setSelection(after.selection);
    },
    onSelect(event: { currentTarget: HTMLTextAreaElement }) {
      const { selectionStart: start, selectionEnd: end } = event.currentTarget;
      setSelection((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end },
      );
    },
    onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
      if (event.nativeEvent.isComposing) return;
      const command = shortcutCommand(event);
      if (command) {
        event.preventDefault();
        return run(command);
      }
      if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
      const before = current();
      if (before.selection.start !== before.selection.end) return;
      const result = continueList(before.body, before.selection.start);
      if (!result) return;
      event.preventDefault();
      commit(result, before);
    },
  };
}

function textarea(id: string): HTMLTextAreaElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLTextAreaElement ? element : null;
}
