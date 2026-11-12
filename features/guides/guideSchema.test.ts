import { describe, expect, it } from 'vitest';
import { parseGuideFile, toGuide } from './guideSchema';
import { searchGuides } from './searchGuides';

const file = `---
title: "Goa in 3 days"
slug: goa-in-3-days
summary: Beaches, forts and a lot of fish curry.
image: /guides/goa-in-3-days.jpg
imageAlt: Palm trees over an empty beach
minutes: 4
author: the OnQuest team
publishedAt: 2026-11-01
places: ["Goa", "Panjim"]
tags: ["beach"]
---
## Day one

Start in Panjim.`;

describe('parseGuideFile', () => {
  it('reads front matter and the body', () => {
    const { data, body } = parseGuideFile(file);
    expect(data.title).toBe('Goa in 3 days');
    expect(data.minutes).toBe(4);
    expect(data.places).toEqual(['Goa', 'Panjim']);
    expect(body.startsWith('## Day one')).toBe(true);
  });

  it('refuses a file without front matter', () => {
    expect(() => parseGuideFile('# Just a title')).toThrow(/front matter/);
  });
});

describe('toGuide', () => {
  it('fills defaults and checks the fields', () => {
    const guide = toGuide(file);
    expect(guide).toMatchObject({ slug: 'goa-in-3-days', draft: false, questKeys: [] });
    expect(() => toGuide(file.replace('author: the OnQuest team', 'author: someone'))).toThrow();
  });
});

describe('searchGuides', () => {
  it('matches title, places and tags, and never drafts', () => {
    const guide = toGuide(file);
    expect(searchGuides([guide], 'panjim')).toEqual([guide]);
    expect(searchGuides([guide], 'beach goa')).toEqual([guide]);
    expect(searchGuides([guide], 'manali')).toEqual([]);
    expect(searchGuides([{ ...guide, draft: true }], 'goa')).toEqual([]);
  });
});
