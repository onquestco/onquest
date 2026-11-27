import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { blogExcerpt } from '@/lib/blog/excerpt';
import { blogCardFixture as blog } from './blogCardFixture';
import { blogRowHref, blogRowMeta, BlogRow } from './BlogRow';
import { firstLetter } from './LetterTile';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));

const render = (props: Parameters<typeof BlogRow>[0]) => renderToStaticMarkup(createElement(BlogRow, props));

describe('blogRowMeta', () => {
  it('"4 min read" and the real like count from the first like', () => {
    expect(blogRowMeta(blog(1, { likeCount: 0 }))).toBe('4 min read');
    expect(blogRowMeta(blog(1, { likeCount: 1 }))).toBe('4 min read · 1 like');
    expect(blogRowMeta(blog(1, { likeCount: 12 }))).toBe('4 min read · 12 likes');
  });

  it('a draft says "Continue editing" (PRD B5)', () => {
    expect(blogRowMeta(blog(1, { status: 'draft' }))).toBe('Continue editing');
  });
});

describe('blogRowHref', () => {
  it('a draft opens the composer', () => {
    expect(blogRowHref(blog(1, { status: 'draft', path: undefined }), true)).toBe(`/blogs/${blog(1).key}/edit`);
  });

  it('your own private blog opens its owner view; public and unlisted open their link', () => {
    expect(blogRowHref(blog(1, { visibility: 'private' }), true)).toBe(`/blogs/${blog(1).key}`);
    expect(blogRowHref(blog(1, { visibility: 'unlisted' }), true)).toBe('/@riya/blog/goa-on-15k-1');
    expect(blogRowHref(blog(1), false)).toBe('/@riya/blog/goa-on-15k-1');
  });
});

describe('firstLetter', () => {
  it('takes the first character by code point, capitalised', () => {
    expect(firstLetter('  goa on 15k')).toBe('G');
    expect(firstLetter('🏖️ beach days')).toBe('🏖');
    expect(firstLetter('गोवा')).toBe('ग');
    expect(firstLetter('')).toBe('·');
  });
});

describe('BlogRow', () => {
  it('text only: a letter tile, never an empty image box', () => {
    const html = render({ blog: blog(1) });
    expect(html).not.toContain('<img');
    expect(html).toMatch(/bg-brand-wash[^"]*">G<\/span>/);
    expect(html).toContain('We stayed in Anjuna and rented a scooter.');
  });

  it('with a cover: the thumbnail, sized and lazy', () => {
    const html = render({ blog: blog(1, { coverThumb: 'https://photos.example/1/thumb.webp' }) });
    expect(html).toMatch(/src="https:\/\/photos.example\/1\/thumb.webp"[^>]*width="76" height="76" loading="lazy"/);
  });

  it('a formatted body shows as plain text, never its markers', () => {
    const html = render({ blog: blog(1, { excerpt: blogExcerpt('Text\n## Text\nHello im alok') }) });
    expect(html).toContain('>Text Text Hello im alok</span>');
    expect(html).not.toContain('##');
  });

  it('no excerpt (photos only): no empty line', () => {
    expect(render({ blog: blog(1, { excerpt: '' }) })).not.toContain('truncate text-label');
  });

  it('your own rows carry the Draft / Unlisted / Private tag and ⋯; public ones no tag', () => {
    expect(render({ blog: blog(1, { status: 'draft' }), own: true })).toContain('>Draft</span>');
    expect(render({ blog: blog(1, { visibility: 'unlisted' }), own: true })).toContain('>Unlisted</span>');
    expect(render({ blog: blog(1, { visibility: 'private' }), own: true })).toContain('>Private</span>');
    const publicRow = render({ blog: blog(1), own: true, onManage: () => undefined });
    expect(publicRow).not.toMatch(/>(Draft|Unlisted|Private)<\/span>/);
    expect(publicRow).toContain('aria-label="Manage Goa on 15k, part 1"');
  });

  it("someone else's rows never show a tag", () => {
    expect(render({ blog: blog(1, { visibility: 'unlisted' }) })).not.toContain('>Unlisted</span>');
  });
});
