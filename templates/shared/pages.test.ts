import { describe, expect, it } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import type { Photo, TripData } from '@/lib/trip/types';
import { toQuestPages } from './pages';

const photo = (id: string): Photo => ({ id, thumb: id, display: id, width: 4, height: 3 });
const withDays = (photosPerDay: number[], places = goaTrip.places): TripData => ({
  ...goaTrip,
  places,
  days: photosPerDay.map((count, index) => ({
    number: index + 1,
    title: `Day ${index + 1}`,
    places: [],
    photos: Array.from({ length: count }, (_, i) => photo(`d${index}p${i}`)),
  })),
});

describe('toQuestPages', () => {
  it('reads cover, one page per day, then the route', () => {
    expect(toQuestPages(withDays([3, 2])).map((page) => page.kind)).toEqual([
      'cover',
      'photos',
      'photos',
      'route',
    ]);
  });

  it('splits an old long day into continuation pages of 3', () => {
    const pages = toQuestPages(withDays([7])).filter((page) => page.kind === 'photos');
    expect(pages.map((page) => [page.title, page.photos.length, page.firstPhotoIndex])).toEqual([
      ['Day 1', 3, 0],
      ['Day 1 · 2', 3, 3],
      ['Day 1 · 3', 1, 6],
    ]);
  });

  it('skips days with no photos, so there are no empty pages', () => {
    expect(toQuestPages(withDays([0, 3])).map((page) => page.kind)).toEqual(['cover', 'photos', 'route']);
  });

  it('leaves out the route page with fewer than 2 places', () => {
    expect(toQuestPages(withDays([3], goaTrip.places.slice(0, 1))).at(-1)?.kind).toBe('photos');
  });
});
