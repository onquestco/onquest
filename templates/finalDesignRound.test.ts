import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TripData } from '@/lib/trip/types';
import alpineStyles from './alpine/alpine.module.css';
import { big as alpineBig } from './alpine/fixtures';
import { PhotoPage as AlpinePhotoPage } from './alpine/PhotoPage';
import { theme as alpineTheme } from './alpine/theme';
import coastalStyles from './coastal/coastal.module.css';
import { CoverPage as CoastalCover } from './coastal/CoverPage';
import { big as coastalBig } from './coastal/fixtures';
import { PhotoPage as CoastalPhotoPage } from './coastal/PhotoPage';
import { RoutePage as CoastalRoute } from './coastal/RoutePage';
import { theme as coastalTheme } from './coastal/theme';
import desertStyles from './desert/desert.module.css';
import { big as desertBig } from './desert/fixtures';
import { PhotoPage as DesertPhotoPage } from './desert/PhotoPage';
import { theme as desertTheme } from './desert/theme';
import { big as monsoonBig } from './monsoon/fixtures';
import monsoonStyles from './monsoon/monsoon.module.css';
import { PhotoPage as MonsoonPhotoPage } from './monsoon/PhotoPage';
import { theme as monsoonTheme } from './monsoon/theme';
import { big as roadtripBig } from './roadtrip/fixtures';
import { PhotoPage as RoadtripPhotoPage } from './roadtrip/PhotoPage';
import roadtripStyles from './roadtrip/roadtrip.module.css';
import { theme as roadtripTheme } from './roadtrip/theme';
import { toQuestPages, type QuestPage } from './shared/pages';

vi.mock('next/font/google', () => import('./shared/nextFontStub'));

// The founder's final design round (docs/reference/templates/CHANGES-final.md): calmer backgrounds,
// a stronger polaroid shadow, smaller text and a softer title shadow, in all six new templates.

const TEMPLATES = ['coastal', 'alpine', 'roadtrip', 'winter', 'monsoon', 'desert'];
const css = (id: string) => readFileSync(join(import.meta.dirname, id, `${id}.module.css`), 'utf8');

type PhotoPageData = Extract<QuestPage, { kind: 'photos' }>;
// Every template's PhotoPage takes the same props.
type PageComponent = typeof CoastalPhotoPage;

function renderPhotoPages(trip: TripData, Page: PageComponent) {
  return toQuestPages(trip)
    .map((page, pageNumber) => ({ page, pageNumber }))
    .filter((item): item is { page: PhotoPageData; pageNumber: number } => item.page.kind === 'photos')
    .map(({ page, pageNumber }) => renderToStaticMarkup(createElement(Page, { trip, page, pageNumber })));
}

// The page's own colour, behind the scenery: the Stage is the first element.
const firstStageBackground = (html: string) => html.match(/^<div[^>]*style="background:([^";]+)/)?.[1];

describe('Final design round: shared CSS in every new template', () => {
  for (const id of TEMPLATES) {
    const sheet = css(id);
    it(`${id}: calms the background with a cheap CSS filter, never an SVG filter`, () => {
      expect(sheet).toMatch(/\.background \{[^}]*filter: blur\(0\.28cqw\)[^}]*transform: scale\(1\.03\)/);
      expect(sheet).not.toMatch(/filter:[^;]*url\(/);
    });
    it(`${id}: gives polaroids the design's stronger shadow and outline instead of the shared one`, () => {
      expect(sheet).toContain('0 1.6cqw 4.2cqw rgba(15, 25, 35, 0.42),\n    0 0 0 0.25cqw rgba(0, 0, 0, 0.05);');
      expect(sheet).toMatch(/\.layer \[data-draggable\] \{\s*filter: none;/);
      expect(sheet).toContain('font: 700 5.208cqw/1 var(--font-hand);');
    });
    it(`${id}: uses the softer title shadow and no zoom`, () => {
      expect(sheet).toContain('text-shadow: 0 0.3cqw 1cqw rgba(0, 0, 30, 0.22);');
      expect(sheet).not.toMatch(/zoom:|0\.5cqw 1\.6cqw rgba\(0, 0, 30, 0\.35\)/);
    });
  }

  it('roadtrip: darker orange titles with a thinner outline', () => {
    const sheet = css('roadtrip');
    expect(sheet).toMatch(/\.title \{[^}]*color: #d9680c;\s*-webkit-text-stroke: 0\.3cqw #7a3b0c;/);
    expect(sheet).toMatch(/\.pageTitle \{[^}]*color: #d9680c;\s*-webkit-text-stroke: 0\.2cqw #7a3b0c;/);
    expect(sheet).toContain('-webkit-text-stroke: 0.2cqw #4a2a12;');
    expect(sheet).not.toContain('#f28c1b');
  });
});

describe('Final design round: light pages keep full-strength scenery, the others show it at 60%', () => {
  type Case = { name: string; trip: TripData; Page: PageComponent; styles: Record<string, string>; paper: string };
  const cases: Case[] = [
    {
      name: 'coastal',
      trip: coastalBig,
      Page: CoastalPhotoPage,
      styles: coastalStyles,
      paper: coastalTheme.colors.paper,
    },
    {
      name: 'roadtrip',
      trip: roadtripBig,
      Page: RoadtripPhotoPage,
      styles: roadtripStyles,
      paper: roadtripTheme.colors.paper,
    },
    { name: 'desert', trip: desertBig, Page: DesertPhotoPage, styles: desertStyles, paper: desertTheme.colors.paper },
  ];
  for (const { name, trip, Page, styles, paper } of cases) {
    it(`${name}: dims only pages without light text, over the paper`, () => {
      for (const html of renderPhotoPages(trip, Page)) {
        const light = html.includes(`${styles.layer} ${styles.light}"`);
        expect(html).toContain(`${styles.background} ${light ? styles.lit : styles.dim}"`);
        if (!light) expect(firstStageBackground(html)).toBe(paper);
      }
    });
  }

  it('coastal: the cover is light, the route page is dimmed over the paper', () => {
    expect(renderToStaticMarkup(createElement(CoastalCover, { trip: coastalBig }))).toContain(
      `${coastalStyles.background} ${coastalStyles.lit}"`,
    );
    const route = renderToStaticMarkup(createElement(CoastalRoute, { trip: coastalBig }));
    expect(route).toContain(`${coastalStyles.background} ${coastalStyles.dim}"`);
    expect(firstStageBackground(route)).toBe(coastalTheme.colors.paper);
  });

  it('alpine: the night page stays dark (its own night blue under the 60% sky, not the pale paper)', () => {
    const pages = renderPhotoPages(alpineBig, AlpinePhotoPage);
    const night = pages.filter((html) => html.includes(`${alpineStyles.layer} ${alpineStyles.night}"`));
    expect(night.length).toBeGreaterThan(0);
    for (const html of night) expect(firstStageBackground(html)).toBe(alpineTheme.dayBackgrounds[2]);
    for (const html of pages.filter((page) => !night.includes(page)))
      expect(firstStageBackground(html)).toBe(alpineTheme.colors.paper);
  });

  it('monsoon: the sky and umbrella pages sit on their own pale colour, so ink text stays readable', () => {
    const pages = renderPhotoPages(monsoonBig, MonsoonPhotoPage);
    for (const html of pages) {
      const light = html.includes(`${monsoonStyles.layer} ${monsoonStyles.light}"`);
      expect(html).toContain(`${monsoonStyles.background} ${light ? monsoonStyles.lit : monsoonStyles.dim}"`);
      if (!light) expect(firstStageBackground(html)).not.toBe(monsoonTheme.colors.paper);
    }
    expect(css('monsoon')).toMatch(/\.layer:not\(\.light\) \.kicker \{\s*color: #c26a00;/);
  });
});
