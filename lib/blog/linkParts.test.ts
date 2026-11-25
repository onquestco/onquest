import { describe, expect, it } from 'vitest';
import { isWebUrl, lineParts } from './linkParts';

describe('lineParts', () => {
  it('turns web links into links and keeps the rest as text', () => {
    expect(lineParts('Booked on https://example.com/stay?id=4 for ₹1,200.')).toEqual([
      { kind: 'text', text: 'Booked on ' },
      { kind: 'link', text: 'https://example.com/stay?id=4', href: 'https://example.com/stay?id=4' },
      { kind: 'text', text: ' for ₹1,200.' },
    ]);
  });

  it('leaves sentence punctuation outside the link', () => {
    expect(lineParts('(see http://goa.example.in).')).toEqual([
      { kind: 'text', text: '(see ' },
      { kind: 'link', text: 'http://goa.example.in', href: 'http://goa.example.in' },
      { kind: 'text', text: ').' },
    ]);
  });

  it("never links anything that isn't http or https", () => {
    for (const text of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.com',
      'www.example.com',
      'https://localhost',
    ]) {
      expect(lineParts(text)).toEqual([{ kind: 'text', text }]);
    }
  });
});

describe('lineParts: trailing punctuation', () => {
  const link = (url: string) => ({ kind: 'link', text: url, href: url });

  it('keeps a ) that closes a ( in the link, and leaves out one that does not', () => {
    expect(lineParts('https://en.wikipedia.org/wiki/Goa_(state)')).toEqual([
      link('https://en.wikipedia.org/wiki/Goa_(state)'),
    ]);
    expect(lineParts('(https://en.wikipedia.org/wiki/Goa_(state)).')).toEqual([
      { kind: 'text', text: '(' },
      link('https://en.wikipedia.org/wiki/Goa_(state)'),
      { kind: 'text', text: ').' },
    ]);
  });

  it('leaves formatting markers after a link out of it', () => {
    expect(lineParts('https://a.example.com**')).toEqual([
      link('https://a.example.com'),
      { kind: 'text', text: '**' },
    ]);
    expect(lineParts('https://a.example.com/x~~')).toEqual([
      link('https://a.example.com/x'),
      { kind: 'text', text: '~~' },
    ]);
  });

  it('handles long punctuation runs in linear time', () => {
    for (const tail of [
      '.'.repeat(9_980),
      ')'.repeat(9_980),
      `${'.'.repeat(9_980)}x`,
      `${')'.repeat(9_980)}x`,
    ]) {
      const start = performance.now();
      const parts = lineParts(`https://a.bc/${tail}`);
      expect(performance.now() - start).toBeLessThan(50);
      expect(parts[0]).toMatchObject({ kind: 'link' });
    }
    expect(lineParts(`https://a.bc/${'.'.repeat(100)}`)).toEqual([
      link('https://a.bc/'),
      { kind: 'text', text: '.'.repeat(100) },
    ]);
  });
});

describe('isWebUrl', () => {
  it('accepts http and https links to a host with a dot', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('http://goa.example.in/stay?id=4')).toBe(true);
  });

  it('refuses a url with spaces or tabs around or inside it (the URL parser would forgive them)', () => {
    for (const text of [
      ' https://a.example.com',
      'https://a.example.com ',
      'https://a.exa\tmple.com',
      'https://a.example.com/\n',
    ]) {
      expect(isWebUrl(text)).toBe(false);
    }
  });

  it('refuses every other scheme, relative links and bare hosts', () => {
    for (const text of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.com',
      '/blog/x',
      'www.example.com',
      'https://localhost',
      '',
    ]) {
      expect(isWebUrl(text)).toBe(false);
    }
  });
});
