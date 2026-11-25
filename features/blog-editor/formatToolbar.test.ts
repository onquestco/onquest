import { describe, expect, it } from 'vitest';
import { buttonLabel, TOOLBAR } from './FormatToolbar';
import { shortcutCommand } from './useBodyFormatting';

// The toolbar's order, names and shortcuts (spec §6.1).

const key = (key: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) =>
  shortcutCommand({
    key,
    metaKey: mods.meta ?? false,
    ctrlKey: mods.ctrl ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
  });

describe('FormatToolbar', () => {
  it('has the buttons in the spec order', () => {
    expect(TOOLBAR.flat().map((button) => button.name)).toEqual([
      'Bold',
      'Italic',
      'Strikethrough',
      'Code',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Bulleted list',
      'Numbered list',
      'Quote',
      'Link',
      'Spoiler',
      'Undo',
      'Redo',
    ]);
  });

  it('names each button with its shortcut, as Apple devices or others write it', () => {
    const labels = (apple: boolean) => TOOLBAR.flat().map((button) => buttonLabel(button, apple));
    expect(labels(false)).toContain('Bold (Ctrl+B)');
    expect(labels(false)).toContain('Strikethrough (Ctrl+Shift+X)');
    expect(labels(false)).toContain('Redo (Ctrl+Y)');
    expect(labels(true)).toContain('Bold (⌘B)');
    expect(labels(true)).toContain('Link (⌘K)');
    expect(labels(true)).toContain('Redo (⌘⇧Z)');
    expect(labels(true)).toContain('Heading 2');
  });
});

describe('shortcuts', () => {
  it.each([
    ['b', {}, 'bold'],
    ['i', {}, 'italic'],
    ['X', { shift: true }, 'strike'],
    ['e', {}, 'code'],
    ['k', {}, 'link'],
    ['z', {}, 'undo'],
    ['Z', { shift: true }, 'redo'],
  ] as const)('⌘/Ctrl+%s %o → %s', (pressed, mods, command) => {
    expect(key(pressed, { ...mods, meta: true })).toBe(command);
    expect(key(pressed, { ...mods, ctrl: true })).toBe(command);
  });

  it('Ctrl+Y is redo too', () => {
    expect(key('y', { ctrl: true })).toBe('redo');
  });

  it('leaves every other key to the browser: plain letters, Ctrl+X (cut), Alt combinations', () => {
    expect(key('b')).toBeNull();
    expect(key('x', { ctrl: true })).toBeNull();
    expect(key('c', { meta: true })).toBeNull();
    expect(key('b', { ctrl: true, alt: true })).toBeNull();
    expect(key('b', { ctrl: true, shift: true })).toBeNull();
  });
});
