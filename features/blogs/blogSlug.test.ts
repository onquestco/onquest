import { describe, expect, it } from 'vitest';
import { firstBlogSlug } from './blogSlug';

describe('firstBlogSlug', () => {
  it('uses the title for public and private blogs', () => {
    expect(firstBlogSlug('Goa on 15k', 'public')).toBe('goa-on-15k');
    expect(firstBlogSlug('Goa on 15k', 'private')).toBe('goa-on-15k');
  });

  it('adds a random 6-character ending for unlisted blogs', () => {
    expect(firstBlogSlug('Goa on 15k', 'unlisted')).toMatch(/^goa-on-15k-[a-z0-9]{6}$/);
  });

  it('falls back to "blog" when the title has no Latin letters', () => {
    expect(firstBlogSlug('गोवा डायरी', 'public')).toBe('blog');
    expect(firstBlogSlug('गोवा डायरी', 'unlisted')).toMatch(/^blog-[a-z0-9]{6}$/);
  });

  it('fits what publish_blog accepts', () => {
    const slug = firstBlogSlug('a very long title '.repeat(10), 'unlisted');
    expect(slug.length).toBeLessThanOrEqual(77);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
