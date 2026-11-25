'use client';

import { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import {
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  NumberedListIcon,
  QuoteIcon,
  RedoIcon,
  SpoilerIcon,
  StrikethroughIcon,
  UndoIcon,
} from '@/design-system/components/icons';
import type { Format } from './formatCommands';

// The formatting toolbar above the blog body (spec §6.1): one row that scrolls sideways on a phone,
// 44px buttons, sticky under the top bar while the body (or the toolbar) has focus.

export type ToolbarCommand = Format | 'undo' | 'redo';

type ToolbarButton = {
  command: ToolbarCommand;
  name: string;
  icon: ReactNode;
  keys?: { apple: string; other: string };
};

const shortcut = (key: string) => ({ apple: `⌘${key}`, other: `Ctrl+${key}` });

/** In the spec's order, in groups: text, headings, blocks, link and spoiler, history. */
export const TOOLBAR: ToolbarButton[][] = [
  [
    { command: 'bold', name: 'Bold', icon: <BoldIcon size={20} />, keys: shortcut('B') },
    { command: 'italic', name: 'Italic', icon: <ItalicIcon size={20} />, keys: shortcut('I') },
    {
      command: 'strike',
      name: 'Strikethrough',
      icon: <StrikethroughIcon size={20} />,
      keys: { apple: '⌘⇧X', other: 'Ctrl+Shift+X' },
    },
    { command: 'code', name: 'Code', icon: <CodeIcon size={20} />, keys: shortcut('E') },
  ],
  [
    { command: 'h1', name: 'Heading 1', icon: <HeadingIcon size={20} level={1} /> },
    { command: 'h2', name: 'Heading 2', icon: <HeadingIcon size={20} level={2} /> },
    { command: 'h3', name: 'Heading 3', icon: <HeadingIcon size={20} level={3} /> },
  ],
  [
    { command: 'bullet', name: 'Bulleted list', icon: <BulletListIcon size={20} /> },
    { command: 'numbered', name: 'Numbered list', icon: <NumberedListIcon size={20} /> },
    { command: 'quote', name: 'Quote', icon: <QuoteIcon size={20} /> },
  ],
  [
    { command: 'link', name: 'Link', icon: <LinkIcon size={20} />, keys: shortcut('K') },
    { command: 'spoiler', name: 'Spoiler', icon: <SpoilerIcon size={20} /> },
  ],
  [
    { command: 'undo', name: 'Undo', icon: <UndoIcon size={20} />, keys: shortcut('Z') },
    { command: 'redo', name: 'Redo', icon: <RedoIcon size={20} />, keys: { apple: '⌘⇧Z', other: 'Ctrl+Y' } },
  ],
];

/** "Bold (⌘B)" on Apple devices, "Bold (Ctrl+B)" elsewhere. */
export function buttonLabel(button: ToolbarButton, apple: boolean): string {
  return button.keys ? `${button.name} (${apple ? button.keys.apple : button.keys.other})` : button.name;
}

const isApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const noSubscription = () => () => {};

/** Known only in the browser; the server renders the Ctrl labels and the browser swaps them. */
function useIsApple(): boolean {
  return useSyncExternalStore(noSubscription, isApple, () => false);
}

type Props = {
  active: Set<Format>;
  canUndo: boolean;
  canRedo: boolean;
  onCommand: (command: ToolbarCommand) => void;
};

export function FormatToolbar({ active, canUndo, canRedo, onCommand }: Props) {
  const apple = useIsApple();
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="-mx-4 flex overflow-x-auto border-y border-line bg-surface px-2 group-focus-within:sticky group-focus-within:top-13 group-focus-within:z-10"
    >
      {TOOLBAR.map((group, index) => (
        <Fragment key={index}>
          {index > 0 && <span aria-hidden className="mx-1 my-3 w-px shrink-0 bg-line" />}
          {group.map((button) => {
            const label = buttonLabel(button, apple);
            const history = button.command === 'undo' || button.command === 'redo';
            const disabled =
              (button.command === 'undo' && !canUndo) || (button.command === 'redo' && !canRedo);
            return (
              <button
                key={button.command}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={history ? undefined : active.has(button.command as Format)}
                disabled={disabled}
                // Keeps the cursor and selection in the text while the button is pressed.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onCommand(button.command)}
                className="flex size-11 shrink-0 items-center justify-center rounded-sm text-ink aria-pressed:bg-brand-wash aria-pressed:text-brand-strong disabled:text-ink-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-strong"
              >
                {button.icon}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
