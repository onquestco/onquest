import { describe, expect, it } from 'vitest';
import type { GeoPlace } from '@/lib/geo';
import type { QuestDocument } from '@/lib/trip/schema';
import { applyPlaces } from './applyPlaces';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let next = 100;
const createId = () => id(next++);

const town = (name: string, geoRef: string): GeoPlace => ({
  name,
  detail: null,
  lat: 15.5,
  lng: 73.8,
  geoRef,
  city: name,
  countryCode: 'IN',
});

function documentWith(pages: number[][], dates: Record<number, string> = {}): QuestDocument {
  return {
    templateId: 'beach',
    title: 'October 2026',
    content: {
      favourites: [],
      days: pages.map((photos, index) => ({
        id: id(50 + index),
        title: `Page ${index + 1}`,
        titleSource: 'auto',
        placeIds: [],
        photoIds: photos.map(id),
      })),
    },
    photos: pages.flat().map((n) => ({ id: id(n), width: 4, height: 3, date: dates[n] })),
    places: [],
  };
}

const dates = { 1: '2026-10-01', 2: '2026-10-01', 3: '2026-10-02', 4: '2026-10-02' };
const at = (photoIds: number[]) => ({ lat: 15.5, lng: 73.8, photoIds: photoIds.map(id) });

describe('applyPlaces', () => {
  it('gives photos and pages their towns and names the titles after them', () => {
    const result = applyPlaces(
      documentWith(
        [
          [1, 2],
          [3, 4],
        ],
        dates,
      ),
      [at([1, 2]), at([3, 4])],
      [town('Panjim', 'R1'), town('Gokarna', 'R2')],
      createId,
      true,
    );
    expect(result.places.map((place) => place.name)).toEqual(['Panjim', 'Gokarna']);
    expect(result.content.days.map((page) => page.placeIds.length)).toEqual([1, 1]);
    expect(result.content.days.map((page) => page.title)).toEqual(['Day 1 · Panjim', 'Day 2 · Gokarna']);
    expect(result.title).toBe('2 days in Panjim');
  });

  it('keeps one place for two groups in the same town', () => {
    const result = applyPlaces(
      documentWith([[1, 2, 3]], dates),
      [at([1]), at([2, 3])],
      [town('Panjim', 'R1'), town('Panjim', 'R1')],
      createId,
      true,
    );
    expect(result.places).toHaveLength(1);
    expect(new Set(result.photos.map((photo) => photo.placeId)).size).toBe(1);
  });

  it('leaves the document alone when no town came back', () => {
    const document = documentWith([[1, 2, 3]], dates);
    expect(applyPlaces(document, [at([1, 2, 3])], [null], createId, true)).toBe(document);
  });

  it("doesn't touch a title the traveller wrote", () => {
    const result = applyPlaces(
      documentWith([[1, 2]], dates),
      [at([1, 2])],
      [town('Panjim', 'R1')],
      createId,
      false,
    );
    expect(result.title).toBe('October 2026');
  });
});
