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
import styles from './roadtrip.module.css';
import roadtrip from './index';
import { hillTrees, ridge, stars } from './scenery';

vi.mock('next/font/google', () => import('../shared/nextFontStub'));

const renderQuest = (trip: TripData) => renderToStaticMarkup(createElement(roadtrip.TripPage, { trip }));
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

describe('Roadtrip: small trip (1 day / 3 photos / no text)', () => {
  const html = renderQuest(small);

  it('has a cover and one photo page, and no route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(2);
    expect(html).not.toContain('Miles covered');
    expect(html).not.toContain('the route');
  });

  it('draws no stamp without a place and no date line without dates', () => {
    expect(html).not.toContain('<b>01</b>');
    expect(html).not.toContain('★');
    expect(html).not.toContain('<time');
  });

  it('shows the three photos on the page and the cover', () => {
    expect(count(html, /<img /g)).toBe(6);
  });
});

describe('Roadtrip: big trip (5 pages / 15 photos)', () => {
  const html = renderQuest(big);

  it('has the cover, five photo pages and the route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(7);
    expect(html).toContain('Miles covered');
  });

  it('uses day for the cover and route, and cycles sunset, hills and night on photo pages', () => {
    expect(scenes(html)).toEqual(['day', 'sunset', 'hills', 'night', 'sunset', 'hills', 'day']);
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
    const ids = [...html.matchAll(/id="(roadtrip[^"]*-sky)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('uses the baked paper grain, never live turbulence filters or masks', () => {
    expect(html).toContain('/templates/roadtrip/paper.webp');
    expect(html).not.toMatch(/feTurbulence|filter="url|mask="url/);
  });

  it('defines every gradient and texture it fills with', () => {
    for (const match of html.matchAll(/fill="url\(#([^)]+)\)"/g))
      expect(html).toContain(`id="${match[1]}"`);
  });
});

describe('Roadtrip: photo pages', () => {
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
    expect(renderQuest(onePlace)).not.toContain('Miles covered');
  });
});

describe('Roadtrip: night pages', () => {
  it('use light text, and only the night pages do', () => {
    const light = photoPages(big).map(({ page, pageNumber }) => {
      const html = renderToStaticMarkup(createElement(PhotoPage, { trip: big, page, pageNumber }));
      return html.includes(`${styles.layer} ${styles.light}"`);
    });
    expect(light).toEqual([false, false, true, false, false]);
  });
});

describe('Roadtrip: cover', () => {
  it('welcomes to the destination and stamps it', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: big }));
    expect(html).toContain('Welcome to Goa');
    expect(html).toContain('★');
  });

  it('escapes the traveler’s text', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: { ...small, title: '<b>Hi</b>' } }));
    expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
  });
});

describe('Roadtrip: scenery', () => {
  it('draws the same hills, trees and stars every time', () => {
    expect(ridge(612, 105, 2, true)).toEqual(ridge(612, 105, 2, true));
    expect(hillTrees(3)).toEqual(hillTrees(3));
    expect(stars(80, 5, 400)).toEqual(stars(80, 5, 400));
    expect(ridge(612, 105, 2, true)).not.toEqual(ridge(612, 105, 3, true));
  });

  it('keeps the trees on the hills and the stars in the sky', () => {
    for (const tree of hillTrees(4)) expect(tree.y).toBeGreaterThanOrEqual(500);
    for (const star of stars(80, 5, 400)) expect(star.y).toBeLessThanOrEqual(400);
  });

  it('keeps every peak inside the page', () => {
    const { area } = ridge(585, 140, 3, true);
    const heights = [...area.matchAll(/L-?[\d.]+ (-?[\d.]+)/g)].map((match) => Number(match[1]));
    for (const y of heights) expect(y).toBeGreaterThan(0);
  });
});

describe('Roadtrip: Instagram export', () => {
  it('makes a story and one carousel slide per page but the route, with the link', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain(shownLink(big.url));
    const slides = CarouselFrames({ trip: big });
    expect(slides).toHaveLength(6);
    const carousel = renderToStaticMarkup(createElement(Fragment, null, ...slides));
    expect(carousel).toContain(escaped(big.days[4]?.title ?? 'missing day'));
  });
});
