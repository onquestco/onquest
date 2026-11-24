import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CreateChooser, createOptionProperties } from './CreateChooser';

// vi.mock is hoisted above the imports. Rendered outside Next.js, so a plain router and a
// plain <a> stand in for next/navigation and next/link.
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: () => undefined, push: () => undefined }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));

const render = (props: Parameters<typeof CreateChooser>[0] = {}) =>
  renderToStaticMarkup(createElement(CreateChooser, props));

describe('CreateChooser', () => {
  it('without access: "Write a blog" stays "Releasing soon", exactly as before', () => {
    const html = render();
    expect(html).toContain('Releasing soon');
    expect(html).not.toContain('/blogs/new');
    expect(html).toContain('href="/quests/new?source=create_menu"');
  });

  it('with access: "Write a blog" opens the composer, without the pill', () => {
    const html = render({ blogsEnabled: true });
    expect(html).toContain('href="/blogs/new?source=create"');
    expect(html).toContain('Write a blog');
    expect(html).toContain('Tips, guides and longer stories from your travels.');
    expect(html).not.toContain('Releasing soon');
  });

  it('passes "Write your own" through to the composer', () => {
    expect(render({ blogsEnabled: true, source: 'write_your_own' })).toContain(
      'href="/blogs/new?source=write_your_own"',
    );
  });

  it('"Create a Quest" stays the larger, highlighted option', () => {
    const html = render({ blogsEnabled: true });
    expect(html.indexOf('Create a Quest')).toBeLessThan(html.indexOf('Write a blog'));
    expect(html).toContain('border-2 border-brand-strong bg-brand-wash');
  });

  it('create_option_tapped: a Quest is always available, a blog only with access', () => {
    expect(createOptionProperties('quest', false)).toEqual({ option: 'quest', available: true });
    expect(createOptionProperties('blog', false)).toEqual({ option: 'blog', available: false });
    expect(createOptionProperties('blog', true)).toEqual({ option: 'blog', available: true });
  });
});
