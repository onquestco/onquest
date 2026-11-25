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
import alpine from './index';
import { pineRow, ridge, stars } from './scenery';

vi.mock('next/font/google', () => import('../shared/nextFontStub'));

const renderQuest = (trip: TripData) => renderToStaticMarkup(createElement(alpine.TripPage, { trip }));
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

describe('Mountain (alpine): small trip (1 day / 3 photos / no text)', () => {
  const html = renderQuest(small);

  it('has a cover and one photo page, and no trail page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(2);
    expect(html).not.toContain('Where I climbed');
    expect(html).not.toContain('the trail');
  });

  it('draws no stamp without a place and no date line without dates', () => {
    expect(html).not.toContain('<b>01</b>');
    expect(html).not.toContain('▲');
    expect(html).not.toContain('<time');
  });

  it('shows the three photos on the page and the cover', () => {
    expect(count(html, /<img /g)).toBe(6);
  });
});

describe('Mountain (alpine): big trip (5 pages / 15 photos)', () => {
  const html = renderQuest(big);

  it('has the cover, five photo pages and the trail page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(7);
    expect(html).toContain('Where I climbed');
  });

  it('uses mist for the cover and trail, and cycles forest, sunrise and night on photo pages', () => {
    expect(scenes(html)).toEqual(['mist', 'forest', 'sunrise', 'night', 'forest', 'sunrise', 'mist']);
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
    const ids = [...html.matchAll(/id="(alpine[^"]*-paper)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('uses the baked textures, never live turbulence filters or masks', () => {
    for (const tile of ['paper', 'streak', 'mist-teal', 'mist-green', 'wash-green', 'wash-peach'])
      expect(html).toContain(`/templates/alpine/${tile}.webp`);
    expect(html).not.toMatch(/feTurbulence|filter="url|mask="url/);
  });

  it('defines the glow it uses on sunrise and night pages (the design left url(#glare) undefined)', () => {
    for (const match of html.matchAll(/fill="url\(#([^)]+)\)"/g))
      expect(html).toContain(`id="${match[1]}"`);
  });
});

describe('Mountain (alpine): photo pages', () => {
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

  it('has no trail page with fewer than 2 places', () => {
    expect(renderQuest(onePlace)).not.toContain('Where I climbed');
  });
});

describe('Mountain (alpine): cover', () => {
  it('welcomes to the destination and stamps it', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: big }));
    expect(html).toContain('Welcome to Goa');
    expect(html).toContain('▲');
  });

  it('escapes the traveler’s text', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: { ...small, title: '<b>Hi</b>' } }));
    expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
  });
});

describe('Mountain (alpine): scenery', () => {
  it('draws the same peaks, trees and stars every time', () => {
    expect(ridge(612, 105, 2, true)).toEqual(ridge(612, 105, 2, true));
    expect(pineRow(615, 13, 1, 3)).toEqual(pineRow(615, 13, 1, 3));
    expect(stars(5)).toEqual(stars(5));
    expect(ridge(612, 105, 2, true)).not.toEqual(ridge(612, 105, 3, true));
  });

  it('keeps every peak inside the page', () => {
    const { area } = ridge(585, 140, 3, true);
    const heights = [...area.matchAll(/L-?[\d.]+ (-?[\d.]+)/g)].map((match) => Number(match[1]));
    for (const y of heights) expect(y).toBeGreaterThan(0);
  });
});

describe('Mountain (alpine): Instagram export', () => {
  it('makes a story and one carousel slide per page but the trail, with the link', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain(shownLink(big.url));
    const slides = CarouselFrames({ trip: big });
    expect(slides).toHaveLength(6);
    const carousel = renderToStaticMarkup(createElement(Fragment, null, ...slides));
    expect(carousel).toContain(escaped(big.days[4]?.title ?? 'missing day'));
  });
});
