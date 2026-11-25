// Links in blog text (PRD edge case "pasted links"): http and https runs become tappable links,
// everything else stays text. Nothing else is ever read as markup, and `javascript:` can't match.

export type LinePart = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

const URL_RUN = /https?:\/\/[^\s<>"]+/gi;
/** Sentence punctuation right after a link belongs to the sentence, not the link. */
const TRAILING = /[.,;:!?'’”)\]]+$/;

export function lineParts(line: string): LinePart[] {
  const parts: LinePart[] = [];
  let index = 0;
  for (const match of line.matchAll(URL_RUN)) {
    const start = match.index;
    const trailing = match[0].match(TRAILING)?.[0] ?? '';
    const url = match[0].slice(0, match[0].length - trailing.length);
    if (!isWebUrl(url)) continue;
    if (start > index) parts.push({ kind: 'text', text: line.slice(index, start) });
    parts.push({ kind: 'link', text: url, href: url });
    index = start + url.length;
  }
  if (index < line.length) parts.push({ kind: 'text', text: line.slice(index) });
  return mergeText(parts);
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
