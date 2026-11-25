import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { blogCardFixture as blog } from '@/features/blogs/blogCardFixture';
import { ExploreView } from './ExploreView';

// vi.mock is hoisted above the imports. Rendered outside Next.js and without a server.
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('@/features/profile/actions', () => ({ setFollow: vi.fn() }));

const guide = {
  slug: 'monsoon-goa',
  title: 'Monsoon Goa',
  summary: 'Green and quiet.',
  image: '/guides/monsoon.webp',
  imageAlt: 'Rain on a beach',
  minutes: 5,
};

const render = (props: Partial<Parameters<typeof ExploreView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(ExploreView, { signedIn: false, chips: [], trending: [], guides: [], travellers: [], ...props }),
  );

describe('Explore "Stories and guides" (PRD B8, S3)', () => {
  it('OnQuest guides first, then public blogs with "Blog · 4 min read · by @username"', () => {
    const html = render({ guides: [guide], blogs: [blog(1), blog(2, { coverThumb: 'https://photos.example/2/thumb.webp' })] });
    expect(html).toContain('Stories and guides');
    expect(html).toContain('Guide · 5 min read');
    expect(html).toContain('Blog · 4 min read · by @riya');
    expect(html.indexOf('Monsoon Goa')).toBeLessThan(html.indexOf('Goa on 15k, part 1'));
    expect(html).toContain('href="/@riya/blog/goa-on-15k-1"');
    expect(html).toContain('src="https://photos.example/2/thumb.webp"');
  });

  it('blogs alone still make the section, with a letter tile for a text-only blog', () => {
    const html = render({ blogs: [blog(1)] });
    expect(html).toContain('Stories and guides');
    expect(html).toMatch(/bg-brand-wash[^"]*">G<\/span>/);
    expect(html).not.toContain('Nothing to explore yet.');
  });

  it('without blogs, Explore is as before', () => {
    const html = render({ guides: [guide] });
    expect(html).not.toContain('Blog · ');
    expect(render()).toContain('Nothing to explore yet. Be the first to publish a Quest.');
  });
});
