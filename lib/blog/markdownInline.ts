import { findWebUrls, isWebUrl } from './linkParts';
import type { BlogInline, BlogLine } from './markdown';

// Inline syntax in one line of a blog body (blogs-editor spec §4.1): code first, then `[text](url)`
// links, then pasted http(s) links (each one unit, so markers never cut a URL), then
// bold/italic/strike/spoiler. Parsing is linear: every lookup is precomputed or a forward scan
// that's remembered when it fails, and nesting is capped, so a hostile 10,000-character body
// can't make it slow.

type Wrapper = 'bold' | 'italic' | 'strike' | 'spoiler';
type Found = { node: BlogInline; next: number };

/** Deeper markers stay text: real writing never nests this far, and it bounds the work. */
const MAX_DEPTH = 8;
const OPENERS: Partial<Record<string, [Wrapper, number]>> = {
  '**': ['bold', 2],
  '~~': ['strike', 2],
  '>!': ['spoiler', 2],
};
const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);

export class InlineParser {
  /** Code span start → index of its closing backtick. Code is literal, so every other scan skips it. */
  private readonly codeSpans = new Map<number, number>();
  /** Pasted web link start → its end (exclusive). Found outside code; markers never split one. */
  private readonly urlSpans = new Map<number, number>();
  private readonly inCode: Uint8Array;
  /** Built on the first `[`: most lines have no link, so they skip the cost. */
  private links: LinkIndex | undefined;
  /** `]` positions whose `(url)` already failed: every `[` before them fails the same way. */
  private readonly badLinkEnds = new Set<number>();

  private readonly text: string;

  constructor(text: string) {
    this.text = text;
    let open = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== '`') continue;
      if (open === -1 || i === open + 1) open = i;
      else {
        this.codeSpans.set(open, i);
        open = -1;
      }
    }
    const inCode = (this.inCode = new Uint8Array(text.length));
    for (const [start, end] of this.codeSpans) inCode.fill(1, start, end + 1);
    if (/https?:\/\//i.test(text)) {
      // Code blanked out (same length), so a URL never starts in code or runs into it.
      const outsideCode =
        this.codeSpans.size === 0 ? text : Array.from(text, (char, i) => (inCode[i] ? ' ' : char)).join('');
      for (const url of findWebUrls(outsideCode)) this.urlSpans.set(url.start, url.end);
    }
  }

  parse(start: number, end: number, depth: number, inLink: boolean): BlogLine {
    const nodes: BlogLine = [];
    /** Wrapper kinds with no closer left in this range: later openers can't find one either. */
    const noCloser = new Set<Wrapper>();
    let textStart = start;
    let i = start;
    while (i < end) {
      const urlEnd = this.urlSpans.get(i);
      // Inside a link's text a pasted URL is plain text, but still one unit.
      if (inLink && urlEnd !== undefined && urlEnd <= end) {
        i = urlEnd;
        continue;
      }
      const found =
        this.codeAt(i) ??
        (inLink ? undefined : (this.linkAt(i, end, depth) ?? this.urlAt(i, end))) ??
        (depth < MAX_DEPTH ? this.wrapperAt(i, end, depth, inLink, noCloser) : undefined);
      if (!found) {
        i += 1;
        continue;
      }
      if (i > textStart) nodes.push(this.textNode(textStart, i));
      nodes.push(found.node);
      i = textStart = found.next;
    }
    if (end > textStart) nodes.push(this.textNode(textStart, end));
    return nodes;
  }

  private textNode(from: number, to: number): BlogInline {
    return { kind: 'text', text: this.text.slice(from, to), from, to };
  }

  /** A pasted http(s) link, linked as before (lineParts' rules), when it fits in this range. */
  private urlAt(i: number, end: number): Found | undefined {
    const urlEnd = this.urlSpans.get(i);
    if (urlEnd === undefined || urlEnd > end) return undefined;
    const href = this.text.slice(i, urlEnd);
    return {
      node: { kind: 'link', href, children: [this.textNode(i, urlEnd)], from: i, to: urlEnd },
      next: urlEnd,
    };
  }

  private codeAt(i: number): Found | undefined {
    const close = this.codeSpans.get(i);
    if (close === undefined) return undefined;
    return {
      node: { kind: 'code', text: this.text.slice(i + 1, close), from: i, to: close + 1 },
      next: close + 1,
    };
  }

  /** `[text](url)` with a web url; `![…](…)` is never an image, so it stays text. */
  private linkAt(i: number, end: number, depth: number): Found | undefined {
    const text = this.text;
    if (text[i] !== '[' || text[i - 1] === '!') return undefined;
    const links = (this.links ??= new LinkIndex(text, this.inCode));
    const close = links.nextBracket.at(i + 1) ?? text.length;
    if (close >= end || close === i + 1 || this.badLinkEnds.has(close)) return undefined;
    const urlEnd = text[close + 1] === '(' ? (links.matchingParen.at(close + 1) ?? -1) : -1;
    // A url with whitespace or a "](" in it is refused before isWebUrl: both checks are lookups,
    // and with "](" refused, the urls isWebUrl reads never overlap, so the total stays linear.
    const lookupFrom = close + 2;
    const plausible =
      urlEnd !== -1 &&
      urlEnd < end &&
      (links.nextSpace.at(lookupFrom) ?? text.length) > urlEnd &&
      (links.nextLinkMiddle.at(lookupFrom) ?? text.length) > urlEnd;
    const href = plausible ? text.slice(lookupFrom, urlEnd) : '';
    if (!plausible || !isWebUrl(href)) {
      this.badLinkEnds.add(close);
      return undefined;
    }
    const children = this.parse(i + 1, close, depth + 1, true);
    return { node: { kind: 'link', href, children, from: i, to: urlEnd + 1 }, next: urlEnd + 1 };
  }

  private wrapperAt(
    i: number,
    end: number,
    depth: number,
    inLink: boolean,
    noCloser: Set<Wrapper>,
  ): Found | undefined {
    const pair = this.text.slice(i, i + 2);
    const [kind, length] = OPENERS[pair] ?? (pair[0] === '*' ? ['italic', 1] : [undefined, 0]);
    const contentStart = i + length;
    if (!kind || noCloser.has(kind) || contentStart >= end || isSpace(this.text[contentStart]))
      return undefined;
    const close = this.closerOf(kind, contentStart + 1, end);
    if (close === -1) {
      noCloser.add(kind);
      return undefined;
    }
    const children = this.parse(contentStart, close, depth + 1, inLink);
    const to = close + (kind === 'italic' ? 1 : 2);
    return { node: { kind, children, from: i, to }, next: to };
  }

  /** Where the closing marker starts: the first one after `from`, preceded by a non-space, outside code. */
  private closerOf(kind: Wrapper, from: number, end: number): number {
    const text = this.text;
    const stars = kind === 'bold' || kind === 'italic';
    const marker = kind === 'strike' ? '~~' : '!<';
    // Content that starts with code or a URL: its closer can't be inside that unit.
    let j = Math.max(from, this.afterUnit(from - 1) ?? from);
    // The opener's own run of stars ("****x**") can't close it.
    if (stars) while (j < end && text[j - 1] === '*' && text[j] === '*') j++;
    while (j < end) {
      const unitEnd = this.afterUnit(j);
      if (unitEnd !== undefined) {
        j = unitEnd;
      } else if (stars && text[j] === '*') {
        let runEnd = j;
        while (runEnd < end && text[runEnd] === '*') runEnd++;
        // In a run, the last star closes italic and the last two close bold, so "***x***" is both.
        if (!isSpace(text[j - 1])) {
          if (kind === 'bold' && runEnd - j >= 2) return runEnd - 2;
          if (kind === 'italic' && (runEnd - j) % 2 === 1) return runEnd - 1;
        }
        j = runEnd;
      } else {
        if (!stars && j + 1 < end && text.startsWith(marker, j) && !isSpace(text[j - 1])) return j;
        j++;
      }
    }
    return -1;
  }

  /** If a code span or a pasted URL starts at i, the index just after it. Scans jump over both. */
  private afterUnit(i: number): number | undefined {
    const code = this.codeSpans.get(i);
    return code !== undefined ? code + 1 : this.urlSpans.get(i);
  }
}

/** Lookups for `[text](url)`, each built in one pass over the line. */
class LinkIndex {
  /** Next `]` outside code, next whitespace, next `](` at or after each index (line length when none). */
  readonly nextBracket: Int32Array;
  readonly nextSpace: Int32Array;
  readonly nextLinkMiddle: Int32Array;
  /** `(` → its matching `)`, outside code, or -1: a link's url may hold balanced parentheses. */
  readonly matchingParen: Int32Array;

  constructor(text: string, inCode: Uint8Array) {
    const length = text.length;
    this.nextBracket = new Int32Array(length + 1).fill(length);
    this.nextSpace = new Int32Array(length + 1).fill(length);
    this.nextLinkMiddle = new Int32Array(length + 1).fill(length);
    for (let i = length - 1; i >= 0; i--) {
      const char = text[i];
      // Each array has length + 1 entries, so [i + 1] always exists here.
      this.nextBracket[i] = char === ']' && !inCode[i] ? i : (this.nextBracket[i + 1] ?? length);
      this.nextSpace[i] = isSpace(char) ? i : (this.nextSpace[i + 1] ?? length);
      this.nextLinkMiddle[i] =
        char === ']' && text[i + 1] === '(' ? i : (this.nextLinkMiddle[i + 1] ?? length);
    }
    this.matchingParen = new Int32Array(length).fill(-1);
    const opens: number[] = [];
    for (let i = 0; i < length; i++) {
      if (inCode[i]) continue;
      if (text[i] === '(') opens.push(i);
      else if (text[i] === ')' && opens.length > 0) this.matchingParen[opens.pop() ?? 0] = i;
    }
  }
}
