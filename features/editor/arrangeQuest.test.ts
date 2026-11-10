import { describe, expect, it } from 'vitest';
import type { GeoPlace } from '@/lib/geo';
import { arrangeQuest, type ArrangeDeps } from './arrangeQuest';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function photo(n: number, takenAt: string | null, gps?: { lat: number; lng: number }) {
  return { id: id(n), width: 4, height: 3, takenAt, previewUrl: `blob:${n}`, gps };
}

const panjim: GeoPlace = {
  name: 'Panjim',
  detail: 'Goa, India',
  lat: 15.5,
  lng: 73.8,
  geoRef: 'R1',
  city: 'Panjim',
  countryCode: 'IN',
};

// Records what arrangeQuest asked for, in order.
function deps(overrides: Partial<ArrangeDeps> = {}) {
  let next = 500;
  const calls: string[] = [];
  const saved: unknown[] = [];
  const fake: ArrangeDeps = {
    nameLocations: async () => {
      calls.push('nameLocations');
      return [panjim];
    },
    save: async (document) => {
      calls.push('save');
      saved.push(document);
      return true;
    },
    writeCaptions: async () => {
      calls.push('writeCaptions');
      return [{ photoId: id(1), caption: 'Morning in Panjim' }];
    },
    createId: () => id(next++),
    onStep: (step) => calls.push(`step:${step}`),
    ...overrides,
  };
  return { fake, calls, saved };
}

const goa = { lat: 15.49, lng: 73.82 };
const picked = [
  photo(1, '2026-10-01T09:00:00+05:30', goa),
  photo(2, '2026-10-01T12:00:00+05:30', goa),
  photo(3, '2026-10-02T10:00:00+05:30', goa),
];

describe('arrangeQuest', () => {
  it('sorts, names places, saves, then asks for captions', async () => {
    const { fake, calls, saved } = deps();
    const result = await arrangeQuest(picked, undefined, fake);
    expect(calls).toEqual([
      'step:sorting',
      'step:places',
      'nameLocations',
      'save',
      'step:captions',
      'writeCaptions',
    ]);
    expect(result.document.places.map((place) => place.name)).toEqual(['Panjim']);
    expect(saved).toEqual([result.document]);
    expect(result.captions).toHaveLength(1);
    expect(result.failed).toBe(false);
  });

  it('skips places and captions when no photo has a location', async () => {
    const { fake, calls } = deps();
    const result = await arrangeQuest(
      picked.map((item) => ({ ...item, gps: undefined })),
      undefined,
      fake,
    );
    expect(calls).toEqual(['step:sorting', 'save']);
    expect(result.document.photos).toHaveLength(3);
  });

  it('still finishes when the geocoder fails', async () => {
    const { fake, calls } = deps({ nameLocations: () => Promise.reject(new Error('down')) });
    const result = await arrangeQuest(picked, undefined, fake);
    expect(result.document.places).toEqual([]);
    expect(calls).toContain('save');
  });

  it("doesn't ask for captions when the save failed", async () => {
    const { fake, calls } = deps({ save: async () => false });
    await arrangeQuest(picked, undefined, fake);
    expect(calls).not.toContain('writeCaptions');
  });
});
