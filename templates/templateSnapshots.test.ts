import { createHash } from 'node:crypto';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { fullQuest, oldLongDayQuest, smallQuest } from '@/lib/demo/sampleQuests';
import beach from './beach';
import mountain from './mountain';
import type { Template } from './types';

vi.mock('next/font/google', () => import('./shared/nextFontStub'));

// Published Beach and old-Mountain Quests must look exactly as they did before Coastal (templates
// spec AC3). The fingerprints below were taken in CI from main (082377e) before any template change;
// a different fingerprint means existing pages or their Instagram export would change.
const EXPECTED: Record<string, string> = {
  'beach/carousel/full': 'a96ad4d31583ab75',
  'beach/carousel/goa': '9429971af7e3203c',
  'beach/carousel/old': '0980e79cd134bbfb',
  'beach/carousel/small': 'de38abcc4039eba4',
  'beach/page/full': 'cdc105386249c520',
  'beach/page/goa': '15759a1bcd1c5599',
  'beach/page/old': '4f48c7e2847ec790',
  'beach/page/small': '8cddc3fe26a43871',
  'beach/story/full': '61dcd4f139ecb8c2',
  'beach/story/goa': '61dcd4f139ecb8c2',
  'beach/story/old': '61dcd4f139ecb8c2',
  'beach/story/small': '4615954c4a407103',
  'mountain/carousel/full': '5bd25f64c2f10f50',
  'mountain/carousel/goa': '0a63d27ca259238a',
  'mountain/carousel/old': '7725271ce14110d9',
  'mountain/carousel/small': '6d1d8292656c52ed',
  'mountain/page/full': 'a4286e6487379a11',
  'mountain/page/goa': '4bbb5cc11c66915c',
  'mountain/page/old': 'af68e2b1d17b3ab4',
  'mountain/page/small': 'e72bf0640a53f868',
  'mountain/story/full': '3c51f1465b1b6b27',
  'mountain/story/goa': '3c51f1465b1b6b27',
  'mountain/story/old': '3c51f1465b1b6b27',
  'mountain/story/small': 'be1efda4d70c6126',
};

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
