import { describe, expect, it } from 'vitest';
import { jitter } from './jitter';

describe('jitter', () => {
  it('is stable for the same seed and key', () => {
    expect(jitter(42, 'day-1-photo')).toBe(jitter(42, 'day-1-photo'));
  });

  it('changes with the seed', () => {
    const values = new Set([1, 2, 3, 4, 5].map((seed) => jitter(seed, 'cover')));
    expect(values.size).toBeGreaterThan(1);
  });

  it('stays within the limit', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(Math.abs(jitter(seed, 'x', 3))).toBeLessThanOrEqual(3);
    }
  });
});
