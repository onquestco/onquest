import { describe, expect, it } from 'vitest';
import { distanceKm, suggestPlaces, type GpsPhoto } from './suggestPlaces';

const PANJIM = { lat: 15.4909, lng: 73.8278 };
const PALOLEM = { lat: 15.01, lng: 74.0232 };

const photo = (photoId: string, point: typeof PANJIM, hour: number | null): GpsPhoto => ({
  ...point,
  photoId,
  takenAt: hour === null ? null : new Date(2026, 1, 12, hour).toISOString(),
});

describe('distanceKm', () => {
  it('measures real distances', () => {
    expect(distanceKm(PANJIM, PALOLEM)).toBeGreaterThan(55);
    expect(distanceKm(PANJIM, PALOLEM)).toBeLessThan(60);
  });
});

describe('suggestPlaces', () => {
  it('groups photos within about 1 km', () => {
    const closeBy = { lat: PANJIM.lat + 0.003, lng: PANJIM.lng };
    const suggestions = suggestPlaces([photo('one', PANJIM, 9), photo('two', closeBy, 10)]);
    expect(suggestions.map((suggestion) => suggestion.photoIds)).toEqual([['one', 'two']]);
  });

  it('keeps places in the order they were visited', () => {
    const suggestions = suggestPlaces([photo('later', PALOLEM, 18), photo('earlier', PANJIM, 9)]);
    expect(suggestions.map((suggestion) => suggestion.photoIds[0])).toEqual(['earlier', 'later']);
  });

  it('copes with a photo that has no time', () => {
    expect(suggestPlaces([photo('one', PANJIM, null), photo('two', PALOLEM, 9)])).toHaveLength(2);
  });

  it('suggests at most 5 places', () => {
    const spread = Array.from({ length: 15 }, (_, i) => photo(`photo-${i}`, { lat: 10 + i, lng: 70 }, null));
    expect(suggestPlaces(spread)).toHaveLength(5);
  });

  it('puts the biggest group first', () => {
    const suggestions = suggestPlaces([
      photo('a', PANJIM, 9),
      photo('b', PALOLEM, 10),
      photo('c', PALOLEM, 11),
    ]);
    expect(suggestions.map((suggestion) => suggestion.photoIds)).toEqual([['b', 'c'], ['a']]);
  });
});
