import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TripData } from '@/lib/trip/types';
import { shownLink } from '../shared/exportLink';
import { toQuestPages, type QuestPage } from '../shared/pages';
import { CoverPage } from './CoverPage';
import styles from './desert.module.css';
import { CarouselFrames, StoryFrame } from './exportFrames';
import { big, mixed, noCaptions, onePlace, small } from './fixtures';
import desert from './index';
import { PhotoPage } from './PhotoPage';
import { RoutePage } from './RoutePage';
import { dune, stars, sunRays } from './scenery';

vi.mock('next/font/google', () => import('../shared/nextFontStub'));

const renderQuest = (trip: TripData) => renderToStaticMarkup(createElement(desert.TripPage, { trip }));
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
const css = readFileSync(join(import.meta.dirname, 'desert.module.css'), 'utf8');

describe('Desert: template entry', () => {
  it('is live as Desert, with its own default title and closing line', () => {
    expect(desert.id).toBe('desert');
    expect(desert.name).toBe('Desert');
    expect(desert.status).toBe('live');
    expect(desert.defaults).toEqual({ title: 'Into the Dunes', closingHeadline: 'Footprints in the sand.' });
  });
});

describe('Desert: small trip (1 day / 3 photos / no text)', () => {
  const html = renderQuest(small);

  it('has a cover and one photo page, and no route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(2);
    expect(html).not.toContain('Across the sand');
    expect(html).not.toContain('the trail');
  });

  it('draws no stamp without a place and no date line without dates', () => {
    expect(html).not.toContain('<b>01</b>');
    expect(html).not.toContain('☾');
    expect(html).not.toContain('<time');
  });

  it('shows the three photos on the page and the cover', () => {
    expect(count(html, /<img /g)).toBe(6);
  });
});

describe('Desert: big trip (5 pages / 15 photos)', () => {
  const html = renderQuest(big);

  it('has the cover, five photo pages and the route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(7);
    expect(html).toContain('Across the sand');
    expect(html).toContain('the trail');
  });

  it('uses dunes for the cover and route, and cycles sun, dusk and night on photo pages', () => {
    expect(scenes(html)).toEqual(['dunes', 'sun', 'dusk', 'night', 'sun', 'dusk', 'dunes']);
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
    const ids = [...html.matchAll(/id="(desert[^"]*-sky)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('uses the baked paper grain, never live turbulence filters or masks', () => {
    expect(html).toContain('/templates/desert/paper.webp');
    expect(html).not.toMatch(/feTurbulence|feGaussianBlur|filter="url|mask="url/);
  });

  it('defines every gradient and texture it fills with', () => {
    for (const match of html.matchAll(/fill="url\(#([^)]+)\)"/g))
      expect(html).toContain(`id="${match[1]}"`);
  });
});

describe('Desert: photo pages', () => {
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
    expect(renderQuest(onePlace)).not.toContain('Across the sand');
  });
});

describe('Desert: light and ink text', () => {
  const rule = (selector: string) =>
    css.match(new RegExp(`\\n${selector.replace(/\./g, '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';

  it('uses light text on the night pages only, ink on the dunes, sun and dusk', () => {
    expect(isLight(renderToStaticMarkup(createElement(CoverPage, { trip: big })))).toBe(false);
    expect(isLight(renderToStaticMarkup(createElement(RoutePage, { trip: big })))).toBe(false);
    const light = photoPages(big).map(({ page, pageNumber }) =>
      isLight(renderToStaticMarkup(createElement(PhotoPage, { trip: big, page, pageNumber }))),
    );
    expect(light).toEqual([false, false, true, false, false]);
  });

  it('draws titles in #8A4E2C and meta in the ink #6B3F26, and cream #FFF3D6 at night', () => {
    for (const name of ['.title', '.pageTitle']) expect(rule(name)).toContain('color: #8a4e2c;');
    expect(rule('.meta')).toContain('color: #6b3f26;');
    expect(rule('.kicker')).toContain('color: #b4532a;');
    expect(rule('.light .kicker')).toContain('color: #f6c99b;');
    expect(rule('.light .meta')).toContain('color: #fff3d6;');
    expect(css).toMatch(/\.light \.title,\s*\.light \.pageTitle \{\s*color: #fff3d6;/);
  });

  it('has no ambient animation of its own (the shared drop-in already stops under reduced motion)', () => {
    expect(css).not.toMatch(/@keyframes|animation/);
  });
});

describe('Desert: cover', () => {
  const html = renderToStaticMarkup(createElement(CoverPage, { trip: big }));

  it('has three polaroids, welcomes to the destination and stamps it with the moon', () => {
    expect(count(html, /<img /g)).toBe(3);
    expect(html).toContain('Welcome to Goa');
    expect(html).toContain('<b>☾</b>');
  });

  it('has the sparkle sticker where the design puts it (cs = [1, 76, 5, 14])', () => {
    expect(html).toContain('viewBox="-16 -16 32 32"');
    expect(html).toContain('left:76%;top:5%;width:14%;rotate:0deg');
  });

  it('escapes the traveler’s text', () => {
    const escapedHtml = renderToStaticMarkup(
      createElement(CoverPage, { trip: { ...small, title: '<b>Hi</b>' } }),
    );
    expect(escapedHtml).toContain('&lt;b&gt;Hi&lt;/b&gt;');
  });
});

describe('Desert: scenery', () => {
  it('draws the design’s dune() path', () => {
    expect(dune(560, 70, 40)).toBe('M-10 560C100 490,180 490,250 560S340 581 400 518V650H-10Z');
  });

  it('draws the same stars every time, in the sky, different per page', () => {
    expect(stars(70, 4, 360)).toEqual(stars(70, 4, 360));
    expect(stars(70, 4, 360)).not.toEqual(stars(70, 5, 360));
    for (const star of stars(70, 4, 360)) expect(star.y).toBeLessThanOrEqual(360);
  });

  it('gives the sun sticker eight rays from radius 24 to 33', () => {
    const rays = sunRays();
    expect(rays).toHaveLength(8);
    expect(rays[0]).toBe('M24.0 0.0 L33.0 0.0');
  });
});

describe('Desert: Instagram export', () => {
  it('makes a story and one carousel slide per page but the route, with the link', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain(shownLink(big.url));
    expect(story).not.toContain('data-quest-page');
    const slides = CarouselFrames({ trip: big });
    expect(slides).toHaveLength(6);
    const carousel = renderToStaticMarkup(createElement(Fragment, null, ...slides));
    expect(carousel).toContain(escaped(big.days[4]?.title ?? 'missing day'));
  });
});
