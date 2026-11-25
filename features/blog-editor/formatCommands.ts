import { BLOG_BODY_MAX } from '@/lib/blog/limits';
import { parseBlogLine, type BlogInline } from '@/lib/blog/markdown';
import { characterCount } from './textLimits';

// The toolbar's text transforms (blogs-editor spec §6.1): pure functions over (body, selection),
// kept apart from the parser. Inline runs are found with parseBlogLine()'s ranges, so a button is
// active, and toggles off, exactly where the blog page would render that formatting.

/** UTF-16 offsets into the body, as a textarea's selectionStart / selectionEnd. */
export type Selection = { start: number; end: number };
export type Edit = { body: string; selection: Selection };
export type CommandResult = Edit | { error: 'too_long' };

export type InlineFormat = 'bold' | 'italic' | 'strike' | 'code' | 'spoiler';
export type LineFormat = 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'quote';
export type Format = InlineFormat | LineFormat | 'link';

export const TOO_LONG_MESSAGE = 'Not enough room for formatting. Blogs can be up to 10,000 characters.';

const MARKERS: Record<InlineFormat, readonly [open: string, close: string]> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strike: ['~~', '~~'],
  code: ['`', '`'],
  spoiler: ['>!', '!<'],
};
const PREFIXES: Record<Exclude<LineFormat, 'numbered'>, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  bullet: '- ',
  quote: '> ',
};

/** The line around `at`, without its \n. */
export function lineAt(body: string, at: number): { start: number; end: number } {
  const start = at === 0 ? 0 : body.lastIndexOf('\n', at - 1) + 1;
  const newline = body.indexOf('\n', at);
  return { start, end: newline === -1 ? body.length : newline };
}

/** A line's block syntax, for the editor: a bare "- " or "## " counts (you've just started it). */
export function linePrefix(line: string): { format: LineFormat | null; length: number } {
  const heading = /^(#{1,3}) /.exec(line);
  if (heading?.[1]) return { format: `h${heading[1].length}` as LineFormat, length: heading[0].length };
  if (/^[-*] /.test(line)) return { format: 'bullet', length: 2 };
  const numbered = /^\d{1,9}\. /.exec(line);
  if (numbered) return { format: 'numbered', length: numbered[0].length };
  if (line === '>') return { format: 'quote', length: 1 };
  if (line.startsWith('> ')) return { format: 'quote', length: 2 };
  return { format: null, length: 0 };
}

type Run = { kind: Exclude<BlogInline['kind'], 'text'>; from: number; to: number; href?: string };

/** Every formatted run in a line, outermost first, with offsets within the line. */
export function runsOf(line: string): Run[] {
  const runs: Run[] = [];
  const visit = (nodes: BlogInline[]) => {
    for (const node of nodes) {
      if (node.kind === 'text') continue;
      runs.push({
        kind: node.kind,
        from: node.from,
        to: node.to,
        ...(node.kind === 'link' ? { href: node.href } : {}),
      });
      if (node.kind !== 'code') visit(node.children);
    }
  };
  visit(parseBlogLine(line));
  return runs;
}

/** Markers count toward the 10,000-character limit (spec D6): refuse what would go over it. */
function withinLimit(before: string, edit: Edit): CommandResult {
  return edit.body.length > before.length && characterCount(edit.body) > BLOG_BODY_MAX
    ? { error: 'too_long' }
    : edit;
}

const splice = (body: string, from: number, to: number, insert = '') =>
  body.slice(0, from) + insert + body.slice(to);
const isSpace = (char: string | undefined) => char !== undefined && /\s/.test(char);

/**
 * The run of `format` that the selection covers: its content, with or without its markers (or
 * part of them, as a selection dragged across lines often has).
 */
function selectedRun(body: string, start: number, end: number, format: InlineFormat) {
  const [open, close] = MARKERS[format];
  const line = lineAt(body, start);
  const from = start - line.start;
  const to = end - line.start;
  const run = runsOf(body.slice(line.start, line.end)).find(
    (candidate) =>
      candidate.kind === format &&
      candidate.from <= from &&
      from <= candidate.from + open.length &&
      candidate.to - close.length <= to &&
      to <= candidate.to,
  );
  return run && { from: line.start + run.from, to: line.start + run.to };
}

/** Bold, italic, strikethrough, code, spoiler: wrap, unwrap, or insert a pair at the cursor. */
export function toggleInline(body: string, selection: Selection, format: InlineFormat): CommandResult {
  let { start, end } = selection;
  while (start < end && isSpace(body[start])) start++;
  while (end > start && isSpace(body[end - 1])) end--;
  if (start === end) return withinLimit(body, toggleAtCursor(body, start, format));
  if (!body.slice(start, end).includes('\n')) return withinLimit(body, toggleRange(body, start, end, format));

  // Across lines: every non-empty line on its own, since markers never span a line break.
  const segments: Selection[] = [];
  for (let at = start; at <= end; ) {
    const line = lineAt(body, at);
    let from = Math.max(line.start, start);
    let to = Math.min(line.end, end);
    while (from < to && isSpace(body[from])) from++;
    while (to > from && isSpace(body[to - 1])) to--;
    if (from < to) segments.push({ start: from, end: to });
    at = line.end + 1;
  }
  const unwrap = segments.every((segment) => selectedRun(body, segment.start, segment.end, format));
  const [open, close] = MARKERS[format];
  let next = body;
  for (const segment of segments.reverse()) {
    const run = selectedRun(next, segment.start, segment.end, format);
    if (unwrap && run) {
      next = splice(splice(next, run.to - close.length, run.to), run.from, run.from + open.length);
    } else if (!unwrap && !run) {
      next = splice(next, segment.start, segment.end, open + next.slice(segment.start, segment.end) + close);
    }
  }
  const last = lineAt(body, end);
  return withinLimit(body, {
    body: next,
    selection: { start: lineAt(body, start).start, end: last.end + next.length - body.length },
  });
}

function toggleRange(body: string, start: number, end: number, format: InlineFormat): Edit {
  const [open, close] = MARKERS[format];
  const run = selectedRun(body, start, end, format);
  if (run) {
    const unwrapped = splice(splice(body, run.to - close.length, run.to), run.from, run.from + open.length);
    return { body: unwrapped, selection: { start: run.from, end: run.to - open.length - close.length } };
  }
  return {
    body: splice(body, start, end, open + body.slice(start, end) + close),
    selection: { start: start + open.length, end: end + open.length },
  };
}

/**
 * Whether the cursor sits in an empty pair of `format`'s markers. Stars are counted as runs on both
 * sides, since bold and italic share them: "**|**" is an empty bold pair but not an italic one, and
 * "***|***" (Bold, then Italic) is both. Otherwise Italic would take one star off each side of an
 * empty bold pair (review #48, blocking 1).
 */
function emptyPairAt(body: string, at: number, format: InlineFormat): boolean {
  if (format === 'bold' || format === 'italic') {
    let left = 0;
    while (body[at - 1 - left] === '*') left++;
    let right = 0;
    while (body[at + right] === '*') right++;
    if (left !== right || left > 3) return false;
    return format === 'bold' ? left >= 2 : left % 2 === 1;
  }
  const [open, close] = MARKERS[format];
  return (
    at >= open.length &&
    body.slice(at - open.length, at) === open &&
    body.slice(at, at + close.length) === close
  );
}

function toggleAtCursor(body: string, at: number, format: InlineFormat): Edit {
  const [open, close] = MARKERS[format];
  // A pair that was just inserted and is still empty: pressing again takes it out.
  if (emptyPairAt(body, at, format)) {
    return {
      body: splice(body, at - open.length, at + close.length),
      selection: { start: at - open.length, end: at - open.length },
    };
  }
  const line = lineAt(body, at);
  const column = at - line.start;
  const run = runsOf(body.slice(line.start, line.end))
    .filter((candidate) => candidate.kind === format && candidate.from < column && column < candidate.to)
    .at(-1); // the innermost
  if (!run) {
    return {
      body: splice(body, at, at, open + close),
      selection: { start: at + open.length, end: at + open.length },
    };
  }
  const from = line.start + run.from;
  const to = line.start + run.to;
  const contentEnd = to - close.length;
  let cursor = Math.min(at, contentEnd);
  cursor = cursor >= from + open.length ? cursor - open.length : from;
  return {
    body: splice(splice(body, contentEnd, to), from, from + open.length),
    selection: { start: cursor, end: cursor },
  };
}

/**
 * Headings, lists and quotes, on every line the selection touches (blank lines skipped when there
 * are several). If they all have it, it comes off; otherwise it replaces any other block syntax.
 */
export function toggleLine(body: string, selection: Selection, format: LineFormat): CommandResult {
  const first = lineAt(body, selection.start);
  const endsAtLineStart = selection.end > selection.start && body[selection.end - 1] === '\n';
  const last = lineAt(body, Math.max(first.start, endsAtLineStart ? selection.end - 1 : selection.end));
  const lines = body.slice(first.start, last.end).split('\n');
  const touched = lines.length === 1 ? [0] : lines.flatMap((line, index) => (line.trim() ? [index] : []));
  if (touched.length === 0) return { body, selection };
  const remove = touched.every((index) => linePrefix(lines[index] ?? '').format === format);

  let number = 0;
  const rebuilt = lines.map((line, index) => {
    if (!touched.includes(index)) return line;
    const rest = line.slice(linePrefix(line).length);
    if (remove) return rest;
    number += 1;
    return (format === 'numbered' ? `${number}. ` : PREFIXES[format]) + rest;
  });
  const next = splice(body, first.start, last.end, rebuilt.join('\n'));
  if (lines.length > 1) {
    return withinLimit(body, {
      body: next,
      selection: { start: first.start, end: first.start + rebuilt.join('\n').length },
    });
  }
  // One line: the cursor stays on the same text, or moves to just after the new prefix.
  const oldPrefix = linePrefix(lines[0] ?? '').length;
  const newPrefix = linePrefix(rebuilt[0] ?? '').length;
  const move = (position: number) =>
    position < first.start + oldPrefix ? first.start + newPrefix : position + newPrefix - oldPrefix;
  return withinLimit(body, {
    body: next,
    selection: { start: move(selection.start), end: move(selection.end) },
  });
}

/**
 * Enter on a list item (spec §6.1): with text, the next item; on an empty item, the marker goes
 * and the line is left empty, which ends the list. Null: Enter does what it always does.
 */
export function continueList(body: string, cursor: number): CommandResult | null {
  const line = lineAt(body, cursor);
  const text = body.slice(line.start, line.end);
  const prefix = linePrefix(text);
  if ((prefix.format !== 'bullet' && prefix.format !== 'numbered') || cursor < line.start + prefix.length)
    return null;
  if (text.slice(prefix.length).trim() === '') {
    return { body: splice(body, line.start, line.end), selection: { start: line.start, end: line.start } };
  }
  const marker = prefix.format === 'bullet' ? '- ' : `${Number.parseInt(text, 10) + 1}. `;
  const insert = `\n${marker}`;
  return withinLimit(body, {
    body: splice(body, cursor, cursor, insert),
    selection: { start: cursor + insert.length, end: cursor + insert.length },
  });
}

/** What the toolbar shows as on: the runs around the cursor (or selection) and the line's block kind. */
export function activeFormats(body: string, selection: Selection): Set<Format> {
  const line = lineAt(body, selection.start);
  const text = body.slice(line.start, line.end);
  const active = new Set<Format>();
  const block = linePrefix(text).format;
  if (block) active.add(block);
  const from = selection.start - line.start;
  const to = Math.min(selection.end, line.end) - line.start;
  for (const run of runsOf(text)) {
    const inside = from === to ? run.from < from && from < run.to : run.from <= from && to <= run.to;
    if (inside) active.add(run.kind);
  }
  return active;
}
