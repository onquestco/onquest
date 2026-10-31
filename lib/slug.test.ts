import { describe, expect, it } from 'vitest';
import { randomToken, slugify, unlistedSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => expect(slugify('My Goa Trip 2026!')).toBe('my-goa-trip-2026'));
  it('removes accents', () => expect(slugify('Café São Paulo')).toBe('cafe-sao-paulo'));
  it('falls back when empty', () => expect(slugify('🌴🌴')).toBe('trip'));
  it('never ends with a hyphen after trimming', () =>
    expect(slugify('a'.repeat(59) + ' b', 60)).toBe('a'.repeat(59)));
});

describe('unlisted slugs', () => {
  it('adds a 6-character suffix', () => expect(unlistedSlug('Goa 2026')).toMatch(/^goa-2026-[a-z0-9]{6}$/));
  it('uses only safe characters', () => expect(randomToken(50)).toMatch(/^[a-z0-9]{50}$/));
});
