import { describe, expect, it } from 'vitest';
import { createGeocoder, reverseKey, searchKey, toGeoPlace, type GeocoderDeps } from './geo';

// Nominatim is mocked: these check the policy (cache first, one call at a time through the
// limiter, the 5 s budget, nothing sent without a contact email) and the town-level answer.

const PANJIM = {
  osm_type: 'relation',
  osm_id: 1234,
  lat: '15.4909',
  lon: '73.8278',
  name: 'Panaji',
  address: { city: 'Panjim', state: 'Goa', country: 'India', country_code: 'in' },
};

function setup(overrides: Partial<GeocoderDeps> = {}, answers: unknown[] = [PANJIM]) {
  const calls: string[] = [];
  const cache = new Map<string, { places: unknown[] }>();
  let clock = 0;
  const deps: GeocoderDeps = {
    fetch: (async (url: string) => {
      calls.push(String(url));
      return new Response(JSON.stringify(answers.shift() ?? { error: 'Unable to geocode' }));
    }) as unknown as typeof fetch,
    cacheGet: async (keys) =>
      new Map(
        keys.filter((key) => cache.has(key)).map((key) => [key, cache.get(key) as { places: never[] }]),
      ),
    cachePut: async (key, value) => void cache.set(key, value),
    claimSlot: async () => 0,
    sleep: async (ms) => void (clock += ms),
    now: () => clock,
    contactEmail: 'team@onquest.in',
    ...overrides,
  };
  return { geocoder: createGeocoder(deps), calls, cache };
}

describe('toGeoPlace', () => {
  it('names the town and keeps its centre, not the photo location', () => {
    expect(toGeoPlace({ ...PANJIM, lat: 15.4909, lon: 73.8278 })).toEqual({
      name: 'Panjim',
      detail: 'Goa, India',
      lat: 15.4909,
      lng: 73.8278,
      geoRef: 'R1234',
      city: 'Panjim',
      countryCode: 'IN',
    });
  });

  it('falls back from city to town, village and county', () => {
    expect(toGeoPlace({ lat: 1, lon: 2, address: { village: 'Agonda' } })?.name).toBe('Agonda');
    expect(toGeoPlace({ lat: 1, lon: 2, address: {} })).toBeNull();
  });
});

describe('nameLocations', () => {
  it('asks for a town-level answer with points rounded to 2 decimals', async () => {
    const { geocoder, calls } = setup();
    expect((await geocoder.nameLocations([{ lat: 15.4912, lng: 73.8281 }]))[0]?.name).toBe('Panjim');
    expect(calls[0]).toContain('zoom=10');
    expect(calls[0]).toContain('lat=15.49&lon=73.83');
  });

  it('uses the cache first and stores new answers, "no result" included', async () => {
    const { geocoder, calls, cache } = setup({}, [PANJIM, { error: 'Unable to geocode' }]);
    await geocoder.nameLocations([
      { lat: 15.49, lng: 73.83 },
      { lat: 0, lng: 0 },
    ]);
    expect(cache.get(reverseKey({ lat: 0, lng: 0 }))).toEqual({ places: [] });
    await geocoder.nameLocations([{ lat: 15.49, lng: 73.83 }]);
    expect(calls).toHaveLength(2);
  });

  it("doesn't cache failures, so a later try can name the town", async () => {
    const { geocoder, cache } = setup({
      fetch: (async () => new Response('busy', { status: 429 })) as unknown as typeof fetch,
    });
    expect(await geocoder.nameLocations([{ lat: 15.49, lng: 73.83 }])).toEqual([null]);
    expect(cache.size).toBe(0);
  });

  it('waits for the limiter and gives up on points it cannot reach within the budget', async () => {
    const { geocoder, calls } = setup({ claimSlot: async () => 3000 });
    expect(
      await geocoder.nameLocations(
        [
          { lat: 15.49, lng: 73.83 },
          { lat: 9, lng: 9 },
        ],
        5000,
      ),
    ).toEqual([null, null]);
    expect(calls).toHaveLength(0);
  });

  it('stops when the user is over their limit', async () => {
    const { geocoder, calls } = setup({ claimSlot: async () => -1 });
    expect(await geocoder.nameLocations([{ lat: 15.49, lng: 73.83 }])).toEqual([null]);
    expect(calls).toHaveLength(0);
  });

  it('sends nothing to Nominatim without a contact email', async () => {
    const { geocoder, calls } = setup({ contactEmail: undefined });
    expect(await geocoder.nameLocations([{ lat: 15.49, lng: 73.83 }])).toEqual([null]);
    expect(calls).toHaveLength(0);
  });
});

describe('searchPlaces', () => {
  it('searches settlements and caches by the normalised text', async () => {
    const { geocoder, calls, cache } = setup({}, [[PANJIM]]);
    expect((await geocoder.searchPlaces('  Panjim ')).map((place) => place.name)).toEqual(['Panjim']);
    expect(calls[0]).toContain('featureType=settlement');
    expect(cache.has(searchKey('panjim'))).toBe(true);
  });
});
