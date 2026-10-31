import { describe, expect, it } from 'vitest';
import { countDays, formatDateRange } from './dates';

describe('formatDateRange', () => {
  it('shows a single day', () => expect(formatDateRange('2026-02-12')).toBe('12 February'));
  it('shows a range within one month', () =>
    expect(formatDateRange('2026-02-12', '2026-02-16')).toBe('12 – 16 February'));
  it('shows a range across months', () =>
    expect(formatDateRange('2026-02-28', '2026-03-03')).toBe('28 Feb – 3 Mar'));
  it('shows years when crossing a year', () =>
    expect(formatDateRange('2025-12-28', '2026-01-02')).toBe('28 Dec 2025 – 2 Jan 2026'));
});

describe('countDays', () => {
  it('counts inclusively', () => expect(countDays('2026-02-12', '2026-02-16')).toBe(5));
  it('handles a one-day trip', () => expect(countDays('2026-02-12', '2026-02-12')).toBe(1));
});
