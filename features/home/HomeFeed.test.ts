import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FeedPageSchema } from '@/lib/social/schema';
import { feedBlog, feedQuest } from './feedFixture';
import { HomeFeed } from './HomeFeed';

// vi.mock is hoisted above the imports. Rendered outside Next.js and without a server, so links
// and server actions are stand-ins.
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('@/features/trip-page/actions', () => ({ setLike: vi.fn() }));
vi.mock('@/features/blogs/socialActions', () => ({ setBlogLike: vi.fn() }));

const first = (items: unknown[]) => FeedPageSchema.parse({ items, nextOffset: null, now: '2026-11-24T00:00:00Z' });
const render = (items: unknown[]) =>
  renderToStaticMarkup(createElement(HomeFeed, { signedIn: true, first: first(items), suggested: [] }));

describe('HomeFeed (blogs spec S2, PRD B7)', () => {
  it('renders Quest cards and blog cards together, in the feed order', () => {
    const html = render([feedQuest(1), feedBlog(1), feedQuest(2)]);
    expect(html).toContain('Quest 1');
    expect(html).toContain('Quest 2');
    expect(html).toContain('Goa on 15k, part 1');
    expect(html.indexOf('Quest 1')).toBeLessThan(html.indexOf('Goa on 15k, part 1'));
    expect(html.indexOf('Goa on 15k, part 1')).toBeLessThan(html.indexOf('Quest 2'));
  });

  it('a blog card: writer row, "Blog" tag, title, two lines of text, like, comment and share', () => {
    const html = render([feedBlog(1)]);
    expect(html).toContain('href="/@riya"');
    expect(html).toContain('Goa · ');
    expect(html).toMatch(/>Blog<\/span>/);
    expect(html).toContain('href="/@riya/blog/goa-on-15k-1"');
    expect(html).toMatch(/class="line-clamp-2[^"]*">Three days, one scooter/);
    // Liked by me, with the real count.
    expect(html).toMatch(/aria-pressed="true" aria-label="Like"[^>]*>.*?3<\/button>/);
    expect(html).toContain('href="/@riya/blog/goa-on-15k-1#comments"');
    expect(html).toContain('aria-label="Share Goa on 15k, part 1"');
  });

  it('a blog without photos has no picture box; with one, the cover shows', () => {
    expect(render([feedBlog(1)])).not.toContain('<img');
    const html = render([feedBlog(2, { coverThumb: 'https://photos.example/c2/thumb.webp', photoCount: 1 })]);
    expect(html).toContain('src="https://photos.example/c2/thumb.webp"');
  });

  it('a page of blogs only shows the blogs, not "Follow travellers…"', () => {
    const html = render([feedBlog(1)]);
    expect(html).toContain('Goa on 15k, part 1');
    expect(html).not.toContain('Follow travellers to see their Quests here.');
  });
});
