import { InlineParser } from './markdownInline';

// The blog body's formatting (spec docs/specs/blogs-editor.md §4.1): a small Markdown subset read
// on top of the plain-text rules (blank lines split blocks, a single \n is a line break). Every
// node is plain text by construction, so nothing a writer types can become HTML. Anything outside
// the grammar is literal text. Block syntax is read here, inline syntax in markdownInline.ts.

/** from/to: UTF-16 offsets within the line, markers included (for the editor's active state). */
export type BlogInline =
  | { kind: 'text'; text: string; from: number; to: number }
  | { kind: 'code'; text: string; from: number; to: number }
  | { kind: 'bold' | 'italic' | 'strike' | 'spoiler'; children: BlogInline[]; from: number; to: number }
  | { kind: 'link'; href: string; children: BlogInline[]; from: number; to: number };
export type BlogLine = BlogInline[];
export type BlogBlock =
  | { kind: 'paragraph'; lines: BlogLine[] }
  | { kind: 'heading'; level: 1 | 2 | 3; line: BlogLine }
  | { kind: 'quote'; lines: BlogLine[] }
  | { kind: 'list'; ordered: boolean; start: number; items: BlogLine[] };

const SPOILER_TEXT = '(spoiler)';
const MARKER_CHARS = new Set(['*', '`', '~']);
const WORD_CHAR = /[\p{L}\p{N}]/u;
const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);

export function parseBlogBody(body: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  let open: BlogBlock | undefined;
  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') {
      open = undefined;
      continue;
    }
    const prefix = linePrefix(line);
    const content = parseInlineFrom(line, prefix.length);
    if (prefix.kind === 'heading') {
      blocks.push({ kind: 'heading', level: prefix.level, line: content });
      open = undefined;
    } else if (prefix.kind === 'quote') {
      if (open?.kind !== 'quote') blocks.push((open = { kind: 'quote', lines: [] }));
      // A bare ">" keeps the quote going but adds no empty line (empty lines are dropped, as in paragraphs).
      if (line.slice(prefix.length).trim() !== '') open.lines.push(content);
    } else if (prefix.kind === 'item') {
      if (open?.kind !== 'list' || open.ordered !== prefix.ordered) {
        blocks.push((open = { kind: 'list', ordered: prefix.ordered, start: prefix.number, items: [] }));
      }
      open.items.push(content);
    } else {
      if (open?.kind !== 'paragraph') blocks.push((open = { kind: 'paragraph', lines: [] }));
      open.lines.push(content);
    }
  }
  return blocks.filter((block) => block.kind !== 'quote' || block.lines.length > 0);
}

export function parseBlogLine(line: string): BlogLine {
  return parseInlineFrom(line, 0);
}

/**
 * Markers removed, spoilers replaced by "(spoiler)", whitespace collapsed. `cut`: the text was cut
 * short (card excerpts), so an unclosed `>!` hides the rest, and openers whose closer was cut off
 * (`**`, `*`, `~~`, `` ` ``, a `[text](url` at the end) are dropped instead of shown.
 */
export function blogPlainText(text: string, options: { cut?: boolean } = {}): string {
  const out: string[] = [];
  let hidden = false;
  const visit = (nodes: BlogInline[]) => {
    for (const node of nodes) {
      if (hidden) return;
      if (node.kind === 'code') out.push(node.text);
      else if (node.kind === 'spoiler') out.push(` ${SPOILER_TEXT} `);
      else if (node.kind !== 'text') visit(node.children);
      else {
        const opener = options.cut ? unclosedSpoiler(node.text) : -1;
        const shown = opener === -1 ? node.text : node.text.slice(0, opener);
        out.push(options.cut ? withoutOpenMarkers(shown) : shown);
        if (opener !== -1) {
          out.push(` ${SPOILER_TEXT}`);
          hidden = true;
        }
      }
    }
  };
  for (const block of parseBlogBody(options.cut ? withoutCutLink(text) : text)) {
    const lines = block.kind === 'heading' ? [block.line] : block.kind === 'list' ? block.items : block.lines;
    for (const line of lines) {
      visit(line);
      out.push(' ');
    }
  }
  return out.join('').replace(/\s+/g, ' ').trim();
}

/** Where a `>!` that never closed starts (its secret may be what got cut off), or -1. */
function unclosedSpoiler(text: string): number {
  for (let at = text.indexOf('>!'); at !== -1; at = text.indexOf('>!', at + 1)) {
    if (at + 2 >= text.length || !isSpace(text[at + 2])) return at;
  }
  return -1;
}

type Prefix =
  | { kind: 'heading'; level: 1 | 2 | 3; length: number }
  | { kind: 'item'; ordered: boolean; number: number; length: number }
  | { kind: 'quote'; length: number }
  | { kind: 'none'; length: 0 };

/** The block syntax at the start of a line. Headings and items need text after the marker. */
function linePrefix(line: string): Prefix {
  const hasText = (from: number) => line.slice(from).trim() !== '';
  const heading = /^#{1,3} /.exec(line);
  if (heading && hasText(heading[0].length)) {
    return { kind: 'heading', level: (heading[0].length - 1) as 1 | 2 | 3, length: heading[0].length };
  }
  if (/^[-*] /.test(line) && hasText(2)) return { kind: 'item', ordered: false, number: 1, length: 2 };
  const numbered = /^(\d{1,9})\. /.exec(line);
  if (numbered?.[1] && hasText(numbered[0].length)) {
    return { kind: 'item', ordered: true, number: Number(numbered[1]), length: numbered[0].length };
  }
  if (line === '>') return { kind: 'quote', length: 1 };
  if (line.startsWith('> ')) return { kind: 'quote', length: 2 };
  return { kind: 'none', length: 0 };
}

/** Anything that could start inline syntax. Most lines have none and skip the parser. */
const MAY_HAVE_SYNTAX = /[`*~[]|>!|https?:\/\//i;

function parseInlineFrom(line: string, from: number): BlogLine {
  if (from >= line.length) return [];
  if (!MAY_HAVE_SYNTAX.test(line)) return [{ kind: 'text', text: line.slice(from), from, to: line.length }];
  return new InlineParser(line).parse(from, line.length, 0, false);
}

/**
 * Cut text: a run of `*`, `` ` `` or `~~` that opens a word (start or after a non-letter, before a
 * non-space or the end) lost its closer to the cut, so it goes. "4*5" and "~5 km" stay. A loop,
 * not a regex: alternations inside a repeat can backtrack exponentially.
 */
function withoutOpenMarkers(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    let runEnd = i;
    while (runEnd < text.length && MARKER_CHARS.has(text[runEnd] ?? '')) runEnd++;
    if (runEnd === i) {
      out += text[i] ?? '';
      i++;
      continue;
    }
    const run = text.slice(i, runEnd);
    const isMarker = run.includes('*') || run.includes('`') || run.includes('~~');
    const opensWord =
      !WORD_CHAR.test(text[i - 1] ?? '') && (runEnd === text.length || !isSpace(text[runEnd]));
    if (!isMarker || !opensWord) out += run;
    i = runEnd;
  }
  return out;
}

/** Cut text ending inside a link: "[map](https://go" → "map", and "[map of G" → "map of G". */
function withoutCutLink(text: string): string {
  const open = text.lastIndexOf('[');
  if (open === -1) return text;
  const rest = text.slice(open + 1);
  const close = rest.indexOf('](');
  if (close !== -1) return rest.includes(')', close) ? text : text.slice(0, open) + rest.slice(0, close);
  return rest.includes(']') ? text : text.slice(0, open) + rest;
}
