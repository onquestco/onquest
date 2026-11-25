import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TripData } from '@/lib/trip/types';
import { shownLink } from '../shared/exportLink';
import { toQuestPages, type QuestPage } from '../shared/pages';
import { CoverPage } from './CoverPage';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { big, mixed, noCaptions, onePlace, small } from './fixtures';
import monsoon from './index';
import styles from './monsoon.module.css';
import { PhotoPage } from './PhotoPage';
import { RoutePage } from './RoutePage';
import { band, drops, rain } from './scenery';
import { SHADOW_CELLS, SHADOWS_HEIGHT, SHADOWS_WIDTH } from './shadows';

vi.mock('next/font/google', () => import('../shared/nextFontStub'));

const renderQuest = (trip: TripData) => renderToStaticMarkup(createElement(monsoon.TripPage, { trip }));
const photoPages = (trip: TripData) =>
  toQuestPages(trip)
    .map((page, pageNumber) => ({ page, pageNumber }))
    .filter((item): item is { page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number } =>
      item.page.kind === 'photos',
    );
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
const scenes = (html: string) => [...html.matchAll(/data-scene="([a-z]+)"/g)].map((match) => match[1]);
const isLight = (html: string) => html.includes(`${styles.layer} ${styles.light}"`);
// renderToStaticMarkup escapes text the same way.
const escaped = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;');

describe('Monsoon: template entry', () => {
  it('is live as Monsoon, with its own default title and closing line', () => {
    expect(monsoon.id).toBe('monsoon');
    expect(monsoon.name).toBe('Monsoon');
    expect(monsoon.status).toBe('live');
    expect(monsoon.defaults).toEqual({
      title: 'Monsoon Diaries',
      closingHeadline: 'Until the next downpour.',
    });
  });
});

describe('Monsoon: small trip (1 day / 3 photos / no text)', () => {
  const html = renderQuest(small);

  it('has a cover and one photo page, and no route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(2);
    expect(html).not.toContain('Rainy route');
    expect(html).not.toContain('the way');
  });

  it('draws no stamp without a place and no date line without dates', () => {
    expect(html).not.toContain('<b>01</b>');
    expect(html).not.toContain('☔');
    expect(html).not.toContain('<time');
  });

  it('shows the three photos on the page and one on the cover', () => {
    expect(count(html, /<img /g)).toBe(4);
  });
});

describe('Monsoon: big trip (5 pages / 15 photos)', () => {
  const html = renderQuest(big);

  it('has the cover, five photo pages and the route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(7);
    expect(html).toContain('Rainy route');
  });

  it('uses the storm for the cover and route, and cycles lush, sky and umbrellas on photo pages', () => {
    expect(scenes(html)).toEqual(['storm', 'lush', 'sky', 'umbrella', 'lush', 'sky', 'storm']);
  });

  it('server-renders every title, date, caption and place', () => {
    expect(html).toContain(escaped(big.title));
    expect(html).toContain(`@${big.traveler.handle}`);
    for (const day of big.days) {
      expect(html).toContain(escaped(day.title));
      expect(html).toContain(escaped(day.dateLabel ?? 'missing date'));
    }
    expect(html).toContain('Sunset at Palolem, again');
    for (const place of big.places) expect(html).toContain(escaped(place.name));
  });

  it('gives every page its own SVG ids, so pages never borrow each other’s textures', () => {
    const ids = [...html.matchAll(/id="(monsoon[^"]*-sky)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('uses the baked grain and shadows, never live turbulence, blur, drop shadows, filters or masks', () => {
    expect(html).toContain('/templates/monsoon/paper.webp');
    expect(html).toContain('/templates/monsoon/shadows.webp');
    expect(html).not.toMatch(/<filter|feTurbulence|feGaussianBlur|feDropShadow|filter="url|mask="url/);
  });

  it('defines every gradient and texture it fills with', () => {
    for (const match of html.matchAll(/fill="url\(#([^)]+)\)"/g))
      expect(html).toContain(`id="${match[1]}"`);
  });

  it('rains on the lush and umbrella pages and drifts clouds on the sky pages and the route', () => {
    expect(count(html, /data-rain/g)).toBe(3);
    expect(count(html, /data-drift/g)).toBe(3);
  });
});

describe('Monsoon: baked shadows', () => {
  const html = renderQuest(big);

  it('cuts every shadow from inside the WebP', () => {
    for (const cell of Object.values(SHADOW_CELLS)) {
      expect(cell.sx + cell.width).toBeLessThanOrEqual(SHADOWS_WIDTH);
      expect(cell.sy + cell.height).toBeLessThanOrEqual(SHADOWS_HEIGHT);
    }
  });

  it('draws every baked shadow somewhere, each right before its shape', () => {
    for (const [name, cell] of Object.entries(SHADOW_CELLS)) {
      const viewBox = `viewBox="${cell.sx} ${cell.sy} ${cell.width} ${cell.height}"`;
      expect(html, name).toContain(viewBox);
      // The shadow's <svg> ends with the atlas image; the shape's <path> comes next.
      expect(html.split(viewBox)[1], name).toMatch(/^[^>]*><image [^>]*>(<\/image>)?<\/svg><path /);
    }
  });
});

describe('Monsoon: photo pages', () => {
  it('lays out 1, 2 and 3 photos, one page each', () => {
    const pages = photoPages(mixed);
    expect(pages.map(({ page }) => page.photos.length)).toEqual([1, 2, 3]);
    for (const { page, pageNumber } of pages) {
      const html = renderToStaticMarkup(createElement(PhotoPage, { trip: mixed, page, pageNumber }));
      expect(count(html, /<img /g)).toBe(page.photos.length);
    }
  });

  it('stamps the page number and its place when the page has one', () => {
    const [first] = photoPages(mixed);
    if (!first) throw new Error('mixed has photo pages');
    const html = renderToStaticMarkup(createElement(PhotoPage, { trip: mixed, ...first }));
    expect(html).toContain('<b>01</b>');
    expect(html).toContain(escaped(first.page.places.at(-1)?.name ?? 'missing place'));
  });

  it('draws no caption and no empty caption element when captions are missing', () => {
    for (const { page, pageNumber } of photoPages(noCaptions)) {
      const html = renderToStaticMarkup(createElement(PhotoPage, { trip: noCaptions, page, pageNumber }));
      expect(html).not.toMatch(/<i[ >]/);
      expect(html).not.toContain('read the day');
    }
  });

  it('has no route page with fewer than 2 places', () => {
    expect(renderQuest(onePlace)).not.toContain('Rainy route');
  });
});

describe('Monsoon: light and ink text', () => {
  it('uses light text on the storm (cover, route) and lush pages, ink on the sky and umbrella pages', () => {
    expect(isLight(renderToStaticMarkup(createElement(CoverPage, { trip: big })))).toBe(true);
    expect(isLight(renderToStaticMarkup(createElement(RoutePage, { trip: big })))).toBe(true);
    const light = photoPages(big).map(({ page, pageNumber }) =>
      isLight(renderToStaticMarkup(createElement(PhotoPage, { trip: big, page, pageNumber }))),
    );
    expect(light).toEqual([true, false, false, true, false]);
  });

  const css = readFileSync(join(import.meta.dirname, 'monsoon.module.css'), 'utf8');
  const rule = (selector: string) =>
    css.match(new RegExp(`\\n${selector.replace(/\./g, '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';

  it('draws titles and meta in the design’s ink #0F3A63, and white on light pages', () => {
    for (const name of ['.title', '.pageTitle', '.meta']) expect(rule(name)).toContain('color: #0f3a63;');
    expect(rule('.light .kicker')).toContain('color: #bfe6ff;');
    expect(rule('.light .meta')).toContain('color: #fff;');
    expect(css).toMatch(/\.light \.title,\s*\.light \.pageTitle \{\s*color: #fff;/);
  });
});

describe('Monsoon: rain and cloud motion', () => {
  const css = readFileSync(join(import.meta.dirname, 'monsoon.module.css'), 'utf8');

  it('moves only by transform, in the player only, and stops under reduced motion', () => {
    expect(css).toMatch(/@keyframes fall \{\s*from \{\s*transform: translateY/);
    expect(css).toMatch(/@keyframes drift \{\s*from \{\s*transform: translateX/);
    expect(css).toContain(':global([data-quest-page]) .fall {');
    expect(css).toContain(':global([data-quest-page]) .drift {');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.fall,\s*\.drift \{\s*animation: none/);
  });

  it('is not animated in the Instagram export (no player around the page)', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain('data-scene="storm"');
    expect(story).not.toContain('data-quest-page');
  });
});

describe('Monsoon: cover', () => {
  const html = renderToStaticMarkup(createElement(CoverPage, { trip: big }));

  it('has one polaroid, welcoming to the destination, the umbrella stamp and no sticker', () => {
    expect(count(html, /<img /g)).toBe(1);
    expect(html).toContain('Welcome to Goa');
    expect(html).toContain('<b>☔</b>');
    expect(html).toContain('left:70%;top:88%;width:24%');
    // No sticker: none of the five sticker drawings is on the cover.
    for (const viewBox of ['-12 -14 24 30', '0 0 100 60', '-40 -4 80 56', '0 0 40 70', '-24 -24 48 48'])
      expect(html).not.toContain(`viewBox="${viewBox}"`);
  });

  it('uses the design’s special storm, with its own bands, cloud and bolt', () => {
    expect(html).toContain('data-scene="storm"');
    expect(html).toContain(`d="${band(70, 20, 'top', -20)}"`);
    expect(html).not.toContain('data-drift');
  });

  it('escapes the traveler’s text', () => {
    const escapedHtml = renderToStaticMarkup(
      createElement(CoverPage, { trip: { ...small, title: '<b>Hi</b>' } }),
    );
    expect(escapedHtml).toContain('&lt;b&gt;Hi&lt;/b&gt;');
  });
});

describe('Monsoon: scenery', () => {
  it('draws the same rain and drops every time, different per page', () => {
    expect(rain(40, 3)).toEqual(rain(40, 3));
    expect(drops(14, 4)).toEqual(drops(14, 4));
    expect(rain(40, 3)).not.toEqual(rain(40, 4));
  });

  it('matches the design’s drops() numbers', () => {
    // The design's rng(seed*17+2) for seed 1, first drop: x, y, scale.
    let state = 19;
    const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
    const [x, y, scale] = [next(), next(), next()];
    expect(drops(1, 1)[0]).toEqual({
      x: Math.round(x * 370 + 10),
      y: Math.round(y * 560 + 60),
      scale: Math.round((0.7 + scale * 0.8) * 100) / 100,
    });
  });

  it('hangs top bands from above the page and stands bottom bands below it', () => {
    expect(band(70, 20, 'top', -20)).toBe('M-60 70Q-40 50 10 70T170 70T270 70T370 70T470 70V-20H-60Z');
    expect(band(626, 18, 'bottom', 10)).toBe(
      'M-60 626Q-10 608 40 626T200 626T300 626T400 626T500 626V670H-60Z',
    );
  });
});

describe('Monsoon: Instagram export', () => {
  it('makes a story and one carousel slide per page but the route, with the link', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain(shownLink(big.url));
    const slides = CarouselFrames({ trip: big });
    expect(slides).toHaveLength(6);
    const carousel = renderToStaticMarkup(createElement(Fragment, null, ...slides));
    expect(carousel).toContain(escaped(big.days[4]?.title ?? 'missing day'));
  });
});
