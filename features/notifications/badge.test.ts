import { describe, expect, it } from 'vitest';
import { badgeText, bellLabel } from './badge';

describe('badgeText', () => {
  it('shows nothing when there is nothing new', () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(Number.NaN)).toBeNull();
  });

  it('shows the count up to 9, then 9+', () => {
    expect(badgeText(1)).toBe('1');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
  });
});

describe('bellLabel', () => {
  it('tells screen readers how many are unread', () => {
    expect(bellLabel(0)).toBe('Notifications');
    expect(bellLabel(3)).toBe('Notifications, 3 unread');
  });
});
