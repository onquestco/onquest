import { describe, expect, it } from 'vitest';
import { firstPublishSlug } from './publishSlug';

describe('firstPublishSlug', () => {
  it('uses the title for public and private Quests', () => {
    expect(firstPublishSlug('Three days in Goa!', 'public')).toBe('three-days-in-goa');
    expect(firstPublishSlug('Three days in Goa!', 'private')).toBe('three-days-in-goa');
  });

  it('adds a random suffix for unlisted Quests', () => {
    expect(firstPublishSlug('Three days in Goa', 'unlisted')).toMatch(/^three-days-in-goa-[a-z0-9]{6}$/);
  });

  it('leaves room for a -10 suffix within the 80-character limit', () => {
    const long = 'word '.repeat(40);
    expect(firstPublishSlug(long, 'public').length <= 77).toBe(true);
    expect(firstPublishSlug(long, 'unlisted').length <= 77).toBe(true);
  });
});
