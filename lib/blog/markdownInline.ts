import { isWebUrl, lineParts } from './linkParts';
import type { BlogInline, BlogLine } from './markdown';

// Inline syntax in one line of a blog body (blogs-editor spec §4.1): code first, then links, then
// bold/italic/strike/spoiler, with bare http(s) links in what's left. Parsing is linear: every
// lookup is precomputed or a forward scan that's remembered when it fails, and nesting is capped,
// so a hostile 10,000-character body can't make it slow.

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
  /** Next `]` / `)` at or after each index, outside code (line length when none). */
  private readonly nextBracket: Int32Array;
  private readonly nextParen: Int32Array;
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
    const inCode = new Uint8Array(text.length);
    for (const [start, end] of this.codeSpans) inCode.fill(1, start, end + 1);
    const nextOf = (char: string) => {
      const next = new Int32Array(text.length + 1).fill(text.length);
      for (let i = text.length - 1; i >= 0; i--) next[i] = text[i] === char && !inCode[i] ? i : next[i + 1]!;
      return next;
    };
    this.nextBracket = nextOf(']');
    this.nextParen = nextOf(')');
  }

  parse(start: number, end: number, depth: number, inLink: boolean): BlogLine {
    const nodes: BlogLine = [];
    /** Wrapper kinds with no closer left in this range: later openers can't find one either. */
    const noCloser = new Set<Wrapper>();
    let textStart = start;
    let i = start;
    while (i < end) {
      const found =
        this.codeAt(i) ??
        (inLink ? undefined : this.linkAt(i, end, depth)) ??
        (depth < MAX_DEPTH ? this.wrapperAt(i, end, depth, inLink, noCloser) : undefined);
      if (!found) {
        i += 1;
        continue;
      }
      nodes.push(...this.textNodes(textStart, i, inLink), found.node);
      i = textStart = found.next;
    }
    nodes.push(...this.textNodes(textStart, end, inLink));
    return nodes;
  }

  /** Plain text, with bare http(s) links linked as before (lineParts), except inside a link. */
  private textNodes(from: number, to: number, inLink: boolean): BlogInline[] {
    if (to <= from) return [];
    const text = this.text.slice(from, to);
    if (inLink) return [{ kind: 'text', text, from, to }];
    let at = from;
    return lineParts(text).map((part) => {
      const range = { from: at, to: (at += part.text.length) };
      const node: BlogInline = { kind: 'text', text: part.text, ...range };
      return part.kind === 'link' ? { kind: 'link', href: part.href, children: [node], ...range } : node;
    });
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
    const close = this.nextBracket[i + 1]!;
    if (close >= end || close === i + 1 || this.badLinkEnds.has(close)) return undefined;
    const urlEnd = text[close + 1] === '(' ? this.nextParen[close + 2]! : end;
    const href = text.slice(close + 2, urlEnd);
    if (urlEnd >= end || /\s/.test(href) || !isWebUrl(href)) {
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
    // Content that starts with code: its closer can't be inside that code.
    let j = Math.max(from, (this.codeSpans.get(from - 1) ?? -1) + 1);
    // The opener's own run of stars ("****x**") can't close it.
    if (stars) while (j < end && text[j - 1] === '*' && text[j] === '*') j++;
    while (j < end) {
      const code = this.codeSpans.get(j);
      if (code !== undefined) {
        j = code + 1;
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
}
