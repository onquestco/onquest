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
import coastal from './index';

vi.mock('next/font/google', () => import('../shared/nextFontStub'));

const renderQuest = (trip: TripData) => renderToStaticMarkup(createElement(coastal.TripPage, { trip }));
const photoPages = (trip: TripData) =>
  toQuestPages(trip)
    .map((page, pageNumber) => ({ page, pageNumber }))
    .filter((item): item is { page: Extract<QuestPage, { kind: 'photos' }>; pageNumber: number } =>
      item.page.kind === 'photos',
    );
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
// renderToStaticMarkup escapes text the same way.
const escaped = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;');

describe('Coastal: small trip (1 day / 3 photos / no text)', () => {
  const html = renderQuest(small);

  it('has a cover and one photo page, and no route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(2);
    expect(html).not.toContain('Where I went');
    expect(html).not.toContain('the route');
  });

  it('draws no stamp without a place and no date line without dates', () => {
    expect(html).not.toContain('<b>01</b>');
    expect(html).not.toContain('☀');
    expect(html).not.toContain('<time');
  });

  it('shows the three photos on the page and the cover', () => {
    expect(count(html, /<img /g)).toBe(6);
  });
});

describe('Coastal: big trip (5 pages / 15 photos)', () => {
  const html = renderQuest(big);

  it('has the cover, five photo pages and the route page', () => {
    expect(count(html, /data-quest-page=/g)).toBe(7);
    expect(html).toContain('Where I went');
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

  it('gives every page its own SVG ids, so pages never borrow each other’s sea', () => {
    const ids = [...html.matchAll(/id="(coastal[^"]*-sand)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('uses the baked textures, never live turbulence filters', () => {
    expect(html).toContain('/templates/coastal/ripple.webp');
    expect(html).not.toMatch(/feTurbulence|filter="url/);
  });
});

describe('Coastal: photo pages', () => {
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
    expect(renderQuest(onePlace)).not.toContain('Where I went');
  });
});

describe('Coastal: cover', () => {
  it('welcomes to the destination and stamps it', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: big }));
    expect(html).toContain('Welcome to Goa');
    expect(html).toContain('☀');
  });

  it('escapes the traveler’s text', () => {
    const html = renderToStaticMarkup(createElement(CoverPage, { trip: { ...small, title: '<b>Hi</b>' } }));
    expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
  });
});

describe('Coastal: Instagram export', () => {
  it('makes a story and one carousel slide per page but the route, with the link', () => {
    const story = renderToStaticMarkup(createElement(StoryFrame, { trip: big }));
    expect(story).toContain(shownLink(big.url));
    const slides = CarouselFrames({ trip: big });
    expect(slides).toHaveLength(6);
    const carousel = renderToStaticMarkup(createElement(Fragment, null, ...slides));
    expect(carousel).toContain(escaped(big.days[4]?.title ?? 'missing day'));
  });
});
