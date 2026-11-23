import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshBlogPages, refreshBlogSocial } from './refreshBlog';

// vi.mock is hoisted above the imports, so refreshBlog gets this updateTag.
const { updateTag } = vi.hoisted(() => ({ updateTag: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag }));

const tags = () => updateTag.mock.calls.map(([tag]) => tag as string);

beforeEach(() => updateTag.mockClear());

describe('refreshBlogPages', () => {
  it('clears the blog under every handle, the profile, social, linked Quest and Explore', () => {
    refreshBlogPages({ ownerKey: 'me', blogKey: 'b1', handles: ['old', 'new', 'new'], slugs: ['goa'] });
    expect(tags().sort()).toEqual(
      [
        'blog-url:old/goa',
        'blog-url:new/goa',
        'profile:me',
        'blog-social:b1',
        'blog-quests:me',
        'explore',
      ].sort(),
    );
  });

  it('has no URL to clear for a blog that was never posted', () => {
    refreshBlogPages({ ownerKey: 'me', blogKey: 'b1', handles: ['me'], slugs: [] });
    expect(tags().filter((tag) => tag.startsWith('blog-url:'))).toEqual([]);
  });
});

describe('refreshBlogSocial', () => {
  it('clears only likes and comments', () => {
    refreshBlogSocial('b1');
    expect(tags()).toEqual(['blog-social:b1']);
  });
});
