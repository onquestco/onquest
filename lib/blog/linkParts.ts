// Links in blog text (PRD edge case "pasted links"): http and https runs become tappable links,
// everything else stays text. Nothing else is ever read as markup, and `javascript:` can't match.

export type LinePart = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

const URL_RUN = /https?:\/\/[^\s<>"]+/gi;
/** Sentence punctuation right after a link belongs to the sentence, not the link (and markers to their formatting). */
const TRAILING = new Set([...".,;:!?'’”]*~"]);

export function lineParts(line: string): LinePart[] {
  const parts: LinePart[] = [];
  let index = 0;
  for (const { start, end } of findWebUrls(line)) {
    if (start > index) parts.push({ kind: 'text', text: line.slice(index, start) });
    const url = line.slice(start, end);
    parts.push({ kind: 'link', text: url, href: url });
    index = end;
  }
  if (index < line.length) parts.push({ kind: 'text', text: line.slice(index) });
  return mergeText(parts);
}

/** Where the pasted web links in a line are: [start, end) of each, trailing punctuation left out. */
export function findWebUrls(line: string): { start: number; end: number }[] {
  const urls: { start: number; end: number }[] = [];
  for (const match of line.matchAll(URL_RUN)) {
    const url = withoutTrailing(match[0]);
    if (isWebUrl(url)) urls.push({ start: match.index, end: match.index + url.length });
  }
  return urls;
}

/**
 * The run minus trailing punctuation, found by walking back one character at a time (a `+$` regex
 * here backtracks quadratically on long punctuation runs). A `)` stays when it closes a `(` in the
 * link, so ".../Goa_(state)" keeps its last character.
 */
function withoutTrailing(run: string): string {
  let unclosed = 0;
  for (const char of run) {
    if (char === '(') unclosed++;
    else if (char === ')') unclosed--;
  }
  let end = run.length;
  while (end > 0) {
    const char = run[end - 1] ?? '';
    if (char === ')' && unclosed < 0) unclosed++;
    else if (!TRAILING.has(char)) break;
    end--;
  }
  return run.slice(0, end);
}

/** http or https with a host that has a dot: the only links a blog can hold (pasted or `[text](url)`). */
export function isWebUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Skipped matches leave text next to text: join them, so a line is as few nodes as possible. */
function mergeText(parts: LinePart[]): LinePart[] {
  return parts.reduce<LinePart[]>((merged, part) => {
    const last = merged.at(-1);
    if (last?.kind === 'text' && part.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', text: last.text + part.text };
    } else merged.push(part);
    return merged;
  }, []);
}
