import { isWebUrl } from '@/lib/blog/linkParts';
import { lineAt, runsOf, type CommandResult, type Edit, type Selection } from './formatCommands';
import { BLOG_BODY_MAX } from '@/lib/blog/limits';
import { characterCount } from './textLimits';

// The Link button and ⌘/Ctrl+K (blogs-editor spec §6.1): `[text](url)`, only to http(s) addresses,
// which is all the parser ever links.

export const LINK_ERROR = 'Enter a link starting with http:// or https://';

/** A link around the cursor: `[text](url)`, or a pasted address (which can't be unlinked). */
export type LinkAtCursor = { from: number; to: number; text: string; href: string; bracketed: boolean };

export function linkAt(body: string, selection: Selection): LinkAtCursor | null {
  const line = lineAt(body, selection.start);
  const text = body.slice(line.start, line.end);
  const column = selection.start - line.start;
  const end = Math.min(selection.end, line.end) - line.start;
  const run = runsOf(text).find(
    (candidate) =>
      candidate.kind === 'link' && candidate.from <= column && end <= candidate.to && column < candidate.to,
  );
  if (!run?.href) return null;
  const bracketed = text[run.from] === '[';
  return {
    from: line.start + run.from,
    to: line.start + run.to,
    // `[text](href)`: the text ends where "](href)" starts.
    text: bracketed ? text.slice(run.from + 1, run.to - run.href.length - 3) : run.href,
    href: run.href,
    bracketed,
  };
}

/**
 * The address as the parser will read it, or null if it isn't a web link. Brackets are
 * percent-encoded, since a ")" would end the link early; spaces aren't allowed in one.
 */
export function cleanHref(input: string): string | null {
  const href = input.trim().replace(/\(/g, '%28').replace(/\)/g, '%29');
  return href && !/\s/.test(href) && isWebUrl(href) ? href : null;
}

/** Puts `[text](href)` in place of the link at the cursor, or of the selection. Empty text uses the address. */
export function applyLink(
  body: string,
  selection: Selection,
  existing: LinkAtCursor | null,
  input: { text: string; href: string },
): CommandResult {
  // Link text is one line, and a "]" would end it early.
  const text = input.text.replace(/\s+/g, ' ').replace(/[[\]]/g, '').trim() || input.href;
  const markup = `[${text}](${input.href})`;
  const from = existing ? existing.from : selection.start;
  const to = existing ? existing.to : selection.end;
  const next = body.slice(0, from) + markup + body.slice(to);
  if (next.length > body.length && characterCount(next) > BLOG_BODY_MAX) return { error: 'too_long' };
  const cursor = from + markup.length;
  return { body: next, selection: { start: cursor, end: cursor } };
}

/** "Remove link": the text stays, formatting inside it included. */
export function removeLink(body: string, link: LinkAtCursor): Edit {
  return {
    body: body.slice(0, link.from) + link.text + body.slice(link.to),
    selection: { start: link.from, end: link.from + link.text.length },
  };
}
