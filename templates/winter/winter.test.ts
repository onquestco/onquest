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
import { PhotoPage } from './PhotoPage';
import winter from './index';
import { drift, forestPines, ridge, snowfall, stars } from './scenery';

vi.mock('next/font/google', () => import('../shared/nextFontStub'));

const renderQuest = (trip: TripData) => renderToStaticMarkup(createElement(winter.TripPage, { trip }));
const photoPages = (trip: TripData) =>
  toQuestPages(trip)
    .map((page, pageNumber) => ({ page, pageNumber }))
    .filter((item): item is { page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number } =>
      item.page.kind === 'photos',
    );
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
const scenes = (html: string) => [...html.matchAll(/data-scene="([a-z]+)"/g)].map((match) => match[1]);
// renderToStaticMarkup escapes text the same way.
const escaped = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;');

describe('Winter: small trip (1 day / 3 photos / no text)', () => {
  const html = renderQuest(small);

  it('has a cover and one photo page, and no route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(2);
    expect(html).not.toContain('Snowy trail');
    expect(html).not.toContain('the way');
  });

  it('draws no stamp without a place and no date line without dates', () => {
    expect(html).not.toContain('<b>01</b>');
    expect(html).not.toContain('❄');
    expect(html).not.toContain('<time');
  });

  it('shows the three photos on the page and the cover', () => {
    expect(count(html, /<img /g)).toBe(6);
  });
});

describe('Winter: big trip (5 pages / 15 photos)', () => {
  const html = renderQuest(big);

  it('has the cover, five photo pages and the route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(7);
    expect(html).toContain('Snowy trail');
  });

  it('uses snow for the cover and route, and cycles forest, cabin and aurora on photo pages', () => {
    expect(scenes(html)).toEqual(['snow', 'forest', 'cabin', 'aurora', 'forest', 'cabin', 'snow']);
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
    const ids = [...html.matchAll(/id="(winter[^"]*-sky)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('uses the baked grain and aurora, never live turbulence, blur, filters or masks', () => {
    expect(html).toContain('/templates/winter/paper.webp');
    expect(html).toContain('/templates/winter/aurora.webp');
    expect(html).not.toMatch(/feTurbulence|feGaussianBlur|filter="url|mask="url/);
  });

  it('defines every gradient and texture it fills with', () => {
    for (const match of html.matchAll(/fill="url\(#([^)]+)\)"/g))
      expect(html).toContain(`id="${match[1]}"`);
  });

  it('lets snow fall on every page, as one plain group', () => {
    expect(count(html, /data-snowfall/g)).toBe(7);
  });
});

describe('Winter: photo pages', () => {
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
    expect(renderQuest(onePlace)).not.toContain('Snowy trail');
  });
});

describe('Winter: light text', () => {
  // Every page kind is `light` in the design: titles, kickers and meta are white or near-white.
  const css = readFileSync(join(import.meta.dirname, 'winter.module.css'), 'utf8');
  const rule = (name: string) => css.match(new RegExp(`\\n\\.${name} \\{([^}]*)\\}`))?.[1] ?? '';

  it('draws the kicker, titles and meta in white on every page', () => {
    expect(rule('kicker')).toContain('color: #e4f6ff');
    for (const name of ['title', 'pageTitle', 'meta']) expect(rule(name)).toContain('color: #fff;');
  });

  it('has no dark-text variant', () => {
    expect(css).not.toMatch(/\.light\b/);
  });
});

describe('Winter: snowfall motion', () => {
  const css = readFileSync(join(import.meta.dirname, 'winter.module.css'), 'utf8');

  it('moves only by transform, in the player only, and stops under reduced motion', () => {
    expect(css).toMatch(/@keyframes fall \{\s*from \{\s*transform: translateY/);
    expect(css).toContain(':global([data-quest-page]) .fall {');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.fall \{\s*animation: none/);
  });

  it('is not animated in the Instagram export (no player around the page)', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain('data-snowfall');
    expect(story).not.toContain('data-quest-page');
  });
});

describe('Winter: cover', () => {
  it('welcomes to the destination and stamps it with a snowflake', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: big }));
    expect(html).toContain('Welcome to Goa');
    expect(html).toContain('❄');
  });

  it('escapes the traveler’s text', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: { ...small, title: '<b>Hi</b>' } }));
    expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
  });
});

describe('Winter: scenery', () => {
  it('draws the same peaks, pines, stars and snow every time', () => {
    expect(ridge(500, 170, 2, true)).toEqual(ridge(500, 170, 2, true));
    expect(forestPines(3)).toEqual(forestPines(3));
    expect(stars(60, 5, 360)).toEqual(stars(60, 5, 360));
    expect(snowfall(46, 1, 0.8)).toEqual(snowfall(46, 1, 0.8));
    expect(snowfall(46, 1, 0.8)).not.toEqual(snowfall(46, 2, 0.8));
  });

  it('matches the design’s snowfall() numbers', () => {
    // The design's rng(seed*5+9) for seed 1, first flake: cx, cy, r, opacity at .8.
    let state = 14;
    const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
    const [x, y, radius, opacity] = [next(), next(), next(), next()];
    expect(snowfall(1, 1, 0.8)[0]).toEqual({
      x: Math.round(x * 390),
      y: Math.round(y * 640),
      radius: Math.round((1.2 + radius * 2.4) * 10) / 10,
      opacity: Math.round(0.8 * (0.4 + opacity * 0.6) * 100) / 100,
    });
  });

  it('keeps the pines along the bottom and the stars in the sky', () => {
    for (const pine of forestPines(4)) expect(pine.y).toBeGreaterThanOrEqual(600);
    for (const star of stars(70, 5, 330)) expect(star.y).toBeLessThanOrEqual(330);
  });

  it('hangs top drifts from the top edge and piles bottom drifts on the bottom edge', () => {
    expect(drift(52, 34, 'top')).toBe('M-10 -10H400V52Q300 86 200 52T-10 52Z');
    expect(drift(622, 34, 'bottom')).toBe('M-10 660H400V622Q300 588 200 622T-10 622Z');
  });
});

describe('Winter: Instagram export', () => {
  it('makes a story and one carousel slide per page but the route, with the link', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain(shownLink(big.url));
    const slides = CarouselFrames({ trip: big });
    expect(slides).toHaveLength(6);
    const carousel = renderToStaticMarkup(createElement(Fragment, null, ...slides));
    expect(carousel).toContain(escaped(big.days[4]?.title ?? 'missing day'));
  });
});
