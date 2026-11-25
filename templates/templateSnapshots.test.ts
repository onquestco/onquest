import { createHash } from 'node:crypto';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { fullQuest, oldLongDayQuest, smallQuest } from '@/lib/demo/sampleQuests';
import beach from './beach';
import mountain from './mountain';
import type { Template } from './types';

// next/font only works inside a Next.js build. A stand-in that returns a stable class name per
// font keeps the markup comparable. vi.mock is hoisted, so the factory can't use outer names.
vi.mock('next/font/google', () => {
  const font = (name: string) => (options: { variable: string }) => ({
    className: name,
    variable: `${name}${options.variable}`,
    style: { fontFamily: name },
  });
  const names = [
    'Bitter',
    'Caveat',
    'Courier_Prime',
    'DM_Sans',
    'Kaushan_Script',
    'Nunito',
    'Pacifico',
    'Playfair_Display',
    'Satisfy',
    'Special_Elite',
    'Work_Sans',
  ];
  return Object.fromEntries(names.map((name) => [name, font(name)]));
});

// Published Beach and old-Mountain Quests must look exactly as they did before Coastal (templates
// spec AC3). The fingerprints below were taken from main before any template change; a different
// fingerprint means existing pages or their Instagram export would change.
const EXPECTED: Record<string, string> = {};

const fingerprint = (node: ReactNode) =>
  createHash('sha256').update(renderToStaticMarkup(node)).digest('hex').slice(0, 16);

const samples = { goa: goaTrip, small: smallQuest, full: fullQuest, old: oldLongDayQuest };

function fingerprints(template: Template) {
  const result: Record<string, string> = {};
  for (const [name, sample] of Object.entries(samples)) {
    const trip = { ...sample, templateId: template.id };
    result[`${template.id}/page/${name}`] = fingerprint(createElement(template.TripPage, { trip }));
    result[`${template.id}/story/${name}`] = fingerprint(createElement(template.StoryFrame, { trip }));
    result[`${template.id}/carousel/${name}`] = fingerprint(
      createElement(Fragment, null, ...template.CarouselFrames({ trip })),
    );
  }
  return result;
}

describe('Beach and old Mountain stay as they were', () => {
  it('renders the same markup for the page, the story and the carousel', () => {
    expect({ ...fingerprints(beach), ...fingerprints(mountain) }).toEqual(EXPECTED);
  });
});
