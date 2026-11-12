import { describe, expect, it } from 'vitest';
import { publishedAgo } from './PublishedAgo';

const now = Date.parse('2026-11-12T12:00:00Z');
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

describe('publishedAgo', () => {
  it('reads like the prototype', () => {
    expect(publishedAgo(ago(0), now)).toBe('Today');
    expect(publishedAgo(ago(1), now)).toBe('Yesterday');
    expect(publishedAgo(ago(5), now)).toBe('5 days ago');
    expect(publishedAgo(ago(21), now)).toBe('3 weeks ago');
    expect(publishedAgo(ago(90), now)).toBe('3 months ago');
    expect(publishedAgo(ago(400), now)).toBe('1 year ago');
  });
});
