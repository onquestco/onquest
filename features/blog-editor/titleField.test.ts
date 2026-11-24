import { describe, expect, it } from 'vitest';
import { bodyCounter, characterCount, cutBody, cutTitle, titleCounter } from './textLimits';

describe('blog title field', () => {
  it('keeps the first 100 characters of a 120-character paste, and the counter says 100 / 100', () => {
    const pasted = 'a'.repeat(120);
    const kept = cutTitle(pasted);
    expect(kept).toBe('a'.repeat(100));
    expect(titleCounter(kept)).toBe('100 / 100');
  });

  it('counts an emoji as one character, as the database does', () => {
    const title = '🌴'.repeat(100);
    expect(title.length).toBe(200); // UTF-16 units
    expect(characterCount(title)).toBe(100);
    expect(cutTitle(title)).toBe(title);
    expect(characterCount(cutTitle('🌴'.repeat(101)))).toBe(100);
  });

  it('counts Devanagari by code point', () => {
    const word = 'गोवा'; // 4 code points
    expect(characterCount(word)).toBe(4);
    const title = word.repeat(26); // 104 code points
    expect(characterCount(cutTitle(title))).toBe(100);
  });

  it('shows the counter from 80 characters on', () => {
    expect(titleCounter('a'.repeat(79))).toBeNull();
    expect(titleCounter('a'.repeat(80))).toBe('80 / 100');
  });

  it('turns pasted line breaks into spaces', () => {
    expect(cutTitle('Goa\non 15k')).toBe('Goa on 15k');
  });
});

describe('blog body field', () => {
  it('keeps at most 10,000 characters and keeps line breaks', () => {
    expect(cutBody('one\n\ntwo')).toBe('one\n\ntwo');
    expect(characterCount(cutBody('x'.repeat(10_050)))).toBe(10_000);
  });

  it('shows its count only near the limit', () => {
    expect(bodyCounter('x'.repeat(100))).toBeNull();
    expect(bodyCounter('x'.repeat(9_500))).toBe('9,500 / 10,000');
  });
});
