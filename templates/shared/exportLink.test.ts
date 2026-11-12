import { describe, expect, it } from 'vitest';
import { shownLink } from './exportLink';

describe('shownLink', () => {
  it('drops the scheme so the link reads like one', () => {
    expect(shownLink('https://onquest.in/@riya/goa-trip')).toBe('onquest.in/@riya/goa-trip');
    expect(shownLink('https://www.onquest.in/@riya/goa-trip')).toBe('onquest.in/@riya/goa-trip');
  });
});
