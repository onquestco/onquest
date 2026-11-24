import { BLOG_BODY_MAX, BLOG_TITLE_COUNTER_FROM, BLOG_TITLE_MAX } from '@/lib/blog/limits';

// The composer counts characters as the database does (char_length: code points), so an emoji is
// one character, not two (BL-01 review S1). Inputs' own maxLength counts UTF-16 units, so the
// fields cut text here instead.

export const characterCount = (text: string) => [...text].length;

function cutTo(text: string, max: number): string {
  const characters = [...text];
  return characters.length <= max ? text : characters.slice(0, max).join('');
}

/** A title is one line: pasted line breaks become spaces, then it keeps the first 100 characters. */
export function cutTitle(text: string): string {
  return cutTo(text.replace(/\r?\n/g, ' '), BLOG_TITLE_MAX);
}

export function cutBody(text: string): string {
  return cutTo(text, BLOG_BODY_MAX);
}

/** "100 / 100" from 80 characters on; nothing before that. */
export function titleCounter(title: string): string | null {
  const count = characterCount(title);
  return count >= BLOG_TITLE_COUNTER_FROM ? `${count} / ${BLOG_TITLE_MAX}` : null;
}

/** The body shows its count only near the limit, so a long paste isn't cut without a word. */
export const BODY_COUNTER_FROM = 9_000;

export function bodyCounter(body: string): string | null {
  const count = characterCount(body);
  return count >= BODY_COUNTER_FROM ? `${count.toLocaleString('en-IN')} / ${BLOG_BODY_MAX.toLocaleString('en-IN')}` : null;
}
