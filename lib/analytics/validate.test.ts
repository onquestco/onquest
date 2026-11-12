import { describe, expect, it } from 'vitest';
import { CLIENT_EVENTS } from './taxonomy';
import { keepAllowed, propertyProblems } from './validate';

describe('propertyProblems', () => {
  const rules = CLIENT_EVENTS.photos_picked;

  it('accepts a valid event', () => {
    const valid = { quest_id: 'k', count: 5, with_dates: 5, with_location: 2, no_metadata: 0 };
    expect(propertyProblems(rules, valid)).toEqual([]);
  });

  it('refuses unknown properties, out-of-range numbers and missing required ones', () => {
    const problems = propertyProblems(rules, { quest_id: 'k', count: 99, title: 'Goa' });
    expect(problems).toContain('title: not in the taxonomy');
    expect(problems).toContain('count: 99 outside 3–15');
    expect(problems).toContain('with_dates: missing');
  });

  it('refuses a value not in the allowed list', () => {
    const app = { entry: 'tiktok', referrer: 'none', signed_in: false };
    expect(propertyProblems(CLIENT_EVENTS.app_opened, app)).toEqual(['entry: "tiktok" not allowed']);
  });
});

describe('keepAllowed', () => {
  it('drops anything not in the event, and undefined values', () => {
    const kept = keepAllowed(CLIENT_EVENTS.app_opened, { entry: 'direct', url: 'x', referrer: undefined });
    expect(kept).toEqual({ entry: 'direct' });
  });
});
