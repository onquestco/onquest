import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseBlogBody } from '@/lib/blog/markdown';
import { BlogArticle } from './BlogArticle';

const photo = (n: number) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  width: 1600,
  height: 1200,
  display: `https://photos.example/${n}/display.webp`,
  thumb: `https://photos.example/${n}/thumb.webp`,
});

const render = (props: Partial<Parameters<typeof BlogArticle>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(BlogArticle, {
      title: 'Goa on 15k: what worked',
      blocks: parseBlogBody('We stayed in Anjuna.\n\nScooters were ₹400 a day.'),
      photos: [],
      ...props,
    }),
  );

describe('BlogArticle', () => {
  it('a text-only blog has no gallery and no empty box', () => {
    const html = render();
    expect(html).not.toContain('data-blog-gallery');
    expect(html).not.toContain('<img');
    expect(html).toContain('<h1');
    expect(html).toContain('Scooters were ₹400 a day.');
  });

  it('shows the gallery with the first photo eager and the rest lazy, sized, with alt text', () => {
    const html = render({ photos: [photo(1), photo(2), photo(3)] });
    expect(html).toContain('data-blog-gallery');
    expect(html).toContain('alt="Photo 1 of Goa on 15k: what worked"');
    expect(html).toMatch(/src="https:\/\/photos.example\/1\/display.webp"[^>]*width="1600" height="1200" loading="eager"/);
    expect(html).toMatch(/src="https:\/\/photos.example\/2\/display.webp"[^>]*loading="lazy"/);
    expect(html).toContain('1 / 3');
  });

  it('a single photo has no counter', () => {
    expect(render({ photos: [photo(1)] })).not.toContain('1 / 1');
  });

  it('shows the place chip only with a place', () => {
    expect(render({ placeName: 'Goa' })).toContain('Goa</p>');
    expect(render()).not.toContain('rounded-pill bg-brand-wash');
  });

  it('photos only with a one-line text: the gallery comes before the text', () => {
    const html = render({ photos: [photo(1)], blocks: parseBlogBody('Sunset.') });
    expect(html.indexOf('data-blog-gallery')).toBeLessThan(html.indexOf('Sunset.'));
  });
});
