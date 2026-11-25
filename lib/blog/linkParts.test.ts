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

describe('isWebUrl', () => {
  it('accepts http and https links to a host with a dot', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('http://goa.example.in/stay?id=4')).toBe(true);
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
