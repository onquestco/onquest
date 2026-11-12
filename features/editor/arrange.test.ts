import { describe, expect, it } from 'vitest';
import { arrangePages, type ArrangePhoto } from './arrange';
import { defaultQuestTitle, pageTitle } from './pageTitle';

// Local time, because days follow the phone's clock.
const at = (day: number, hour: number) => new Date(2026, 1, day, hour).toISOString();
const dated = (id: string, day: number, hour: number, placeName?: string): ArrangePhoto => ({
  id,
  takenAt: at(day, hour),
  placeName,
});
const undated = (id: string): ArrangePhoto => ({ id });
const sizes = (photos: ArrangePhoto[]) => arrangePages(photos).pages.map((page) => page.photoIds.length);

describe('arrangePages', () => {
  it('gives each day its own page when it fits in 5 pages', () => {
    const photos = [
      dated('a', 12, 9),
      dated('b', 12, 10),
      dated('c', 13, 9),
      dated('d', 14, 9),
      dated('e', 14, 10),
    ];
    const { pages } = arrangePages(photos);
    expect(pages.map((page) => page.photoIds)).toEqual([['a', 'b'], ['c'], ['d', 'e']]);
    expect(pages.map((page) => page.title)).toEqual(['Day 1', 'Day 2', 'Day 3']);
  });

  // M3 under F-A1 (recommended): 3 photos a page, so 12 photos over 3 days make 4 pages in date order.
  it('puts 12 photos over 3 days on 4 pages in date order', () => {
    const photos = [12, 13, 14].flatMap((day) =>
      [9, 10, 11, 12].map((hour) => dated(`${day}-${hour}`, day, hour)),
    );
    const { pages } = arrangePages(photos.reverse());
    expect(pages).toHaveLength(4);
    expect(pages[0]?.photoIds).toEqual(['12-9', '12-10', '12-11']);
    expect(pages.map((page) => page.title)).toEqual(['Day 1', 'Days 1–2', 'Days 2–3', 'Day 3']);
  });

  it('never makes more than 5 pages for 15 photos over 9 days', () => {
    const photos = Array.from({ length: 15 }, (_, i) => dated(`p${i}`, 10 + Math.floor(i / 1.7), 10));
    const { pages } = arrangePages(photos);
    expect(pages.length).toBeLessThanOrEqual(5);
    expect(pages.every((page) => /^Days? \d/.test(page.title))).toBe(true);
  });

  it('keeps WhatsApp photos without dates in pick order, titled Page 1 to Page 3', () => {
    const photos = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(undated);
    const { pages, fallbackUsed } = arrangePages(photos);
    expect(pages.map((page) => page.photoIds)).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['g']]);
    expect(pages.map((page) => page.title)).toEqual(['Page 1', 'Page 2', 'Page 3']);
    expect(fallbackUsed).toBe(true);
  });

  it('splits one busy day by time of day', () => {
    const photos = [8, 9, 10, 13, 14, 15, 18, 19, 20].map((hour) => dated(`h${hour}`, 12, hour));
    expect(arrangePages(photos).pages.map((page) => page.title)).toEqual(['Morning', 'Afternoon', 'Evening']);
  });

  it('falls back to page numbers when two pages would share a time of day', () => {
    const photos = [8, 9, 10, 11, 13, 14].map((hour) => dated(`h${hour}`, 12, hour));
    expect(arrangePages(photos).pages.map((page) => page.title)).toEqual(['Page 1', 'Page 2']);
  });

  it('counts a 1 a.m. photo as the night before', () => {
    const { pages } = arrangePages([
      dated('dinner', 12, 21),
      dated('late', 13, 1),
      dated('breakfast', 13, 9),
    ]);
    expect(pages.map((page) => page.photoIds)).toEqual([['dinner', 'late'], ['breakfast']]);
  });

  it('fills the last dated page with undated photos, then starts new pages', () => {
    const photos = [dated('a', 12, 9), undated('x'), undated('y'), undated('z')];
    expect(sizes(photos)).toEqual([3, 1]);
    expect(arrangePages(photos).pages[0]?.photoIds).toEqual(['a', 'x', 'y']);
  });

  it('names pages after their most common place', () => {
    const photos = [dated('a', 12, 9, 'Panjim'), dated('b', 12, 10, 'Panjim'), dated('c', 13, 9, 'Palolem')];
    expect(arrangePages(photos).pages.map((page) => page.title)).toEqual([
      'Day 1 · Panjim',
      'Day 2 · Palolem',
    ]);
  });

  it('sets page dates from its photos', () => {
    const { pages } = arrangePages([dated('a', 12, 9), dated('b', 13, 9), dated('c', 13, 10)]);
    expect(pages[0]).toMatchObject({ startDate: '2026-02-12', endDate: '2026-02-12' });
  });

  it('makes one page for 3 photos with no data', () => {
    expect(sizes(['a', 'b', 'c'].map(undated))).toEqual([3]);
  });
});

describe('pageTitle', () => {
  it('uses Page N without dates', () => {
    expect(pageTitle([{}], 2, undefined)).toBe('Page 2');
  });

  it('counts days from the first trip day', () => {
    expect(
      pageTitle([{ date: '2026-02-15' }, { date: '2026-02-17', placeName: 'Gokarna' }], 3, '2026-02-12'),
    ).toBe('Days 4–6 · Gokarna');
  });
});

describe('defaultQuestTitle', () => {
  it('uses place and days', () => {
    expect(
      defaultQuestTitle([
        { date: '2026-02-12', placeName: 'Goa' },
        { date: '2026-02-15', placeName: 'Goa' },
      ]),
    ).toBe('4 days in Goa');
    expect(defaultQuestTitle([{ date: '2026-02-12', placeName: 'Panjim' }])).toBe('A day in Panjim');
  });

  it('uses the place alone, the month alone, or nothing', () => {
    expect(defaultQuestTitle([{ placeName: 'Panjim' }])).toBe('Panjim');
    expect(defaultQuestTitle([{ date: '2026-10-17' }])).toBe('October 2026');
    expect(defaultQuestTitle([{}])).toBeUndefined();
  });
});
