import { z } from 'zod';

// Town names for photo locations, from OpenStreetMap Nominatim (spec A §3.4). Only this file
// knows the provider. Its usage policy is kept across every server instance by Postgres:
// answers are cached forever, and calls go one a second through claim_geocoder_slot.
// Points arrive already rounded to 2 decimals (~1 km): photo GPS never reaches the server exactly.

export type GeoPlace = {
  name: string;
  /** "Goa, India": shown under search results. */
  detail: string | null;
  /** The town's centre, never the photo's location. */
  lat: number;
  lng: number;
  /** OSM type + id, e.g. "R1234", for "everyone's trips to Goa" later. */
  geoRef: string | null;
  city: string | null;
  countryCode: string | null;
};

export type Point = { lat: number; lng: number };

const NominatimPlaceSchema = z.object({
  osm_type: z.string().optional(),
  osm_id: z.number().optional(),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  name: z.string().optional(),
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      county: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
    })
    .optional(),
});
type NominatimPlace = z.infer<typeof NominatimPlaceSchema>;

export function toGeoPlace(place: NominatimPlace): GeoPlace | null {
  const address = place.address ?? {};
  const name = address.city ?? address.town ?? address.village ?? address.county ?? place.name;
  if (!name) return null;
  const countryCode = address.country_code?.toUpperCase();
  return {
    name: name.slice(0, 60),
    detail: [address.state, address.country].filter(Boolean).join(', ') || null,
    lat: place.lat,
    lng: place.lon,
    geoRef: place.osm_type && place.osm_id ? `${place.osm_type[0]!.toUpperCase()}${place.osm_id}` : null,
    city: name.slice(0, 100),
    countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
  };
}

export const reverseKey = ({ lat, lng }: Point) => `rev:10:${lat.toFixed(2)}:${lng.toFixed(2)}`;
export const searchKey = (text: string) => `search:en:${text.trim().toLowerCase().replace(/\s+/g, ' ')}`;

type Cached = { places: GeoPlace[] };

export type GeocoderDeps = {
  fetch: typeof fetch;
  cacheGet: (keys: string[]) => Promise<Map<string, Cached>>;
  cachePut: (key: string, value: Cached) => Promise<void>;
  /** 0 = go now (the call is logged), > 0 = ms to wait, -1 = this user is over their limit. */
  claimSlot: (kind: 'reverse' | 'search') => Promise<number>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** GEOCODER_CONTACT_EMAIL. Without it nothing is sent to Nominatim: cache only. */
  contactEmail: string | undefined;
};

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT_MS = 2500;

export function createGeocoder(deps: GeocoderDeps) {
  /** One Nominatim call through the limiter, or undefined if it couldn't happen before the deadline. */
  async function call(
    kind: 'reverse' | 'search',
    url: string,
    deadline: number,
  ): Promise<unknown[] | undefined> {
    if (!deps.contactEmail) return undefined;
    for (;;) {
      if (deps.now() >= deadline) return undefined;
      const wait = await deps.claimSlot(kind);
      if (wait < 0) return undefined;
      if (wait === 0) break;
      if (deps.now() + wait >= deadline) return undefined;
      await deps.sleep(wait);
    }
    try {
      const response = await deps.fetch(url, {
        headers: { 'User-Agent': `OnQuest/1.0 (+https://onquest.in; ${deps.contactEmail})` },
        signal: AbortSignal.timeout(Math.max(1, Math.min(REQUEST_TIMEOUT_MS, deadline - deps.now()))),
      });
      // 429s and 5xx answers are never cached, so a town can be named on a later try.
      if (!response.ok) return undefined;
      const body: unknown = await response.json();
      if (Array.isArray(body)) return body;
      // Reverse lookups answer {"error": "Unable to geocode"} when there's nothing: a real "no result".
      return body && typeof body === 'object' && 'error' in body ? [] : [body];
    } catch {
      return undefined;
    }
  }

  function parsePlaces(raw: unknown[]): GeoPlace[] {
    return raw.flatMap((item) => {
      const parsed = NominatimPlaceSchema.safeParse(item);
      const place = parsed.success ? toGeoPlace(parsed.data) : null;
      return place ? [place] : [];
    });
  }

  return {
    /** Town names for up to 5 points, in order; null where none came back in time. */
    async nameLocations(points: Point[], budgetMs = 5000): Promise<(GeoPlace | null)[]> {
      const deadline = deps.now() + budgetMs;
      const keys = points.map(reverseKey);
      const cached = await deps.cacheGet(keys);
      const results: (GeoPlace | null)[] = [];
      // One at a time: the 1-a-second policy makes parallel calls pointless.
      for (const [index, point] of points.entries()) {
        const key = keys[index]!;
        const hit = cached.get(key);
        if (hit) {
          results.push(hit.places[0] ?? null);
          continue;
        }
        const query = new URLSearchParams({
          lat: point.lat.toFixed(2),
          lon: point.lng.toFixed(2),
          zoom: '10',
          addressdetails: '1',
          'accept-language': 'en',
          format: 'jsonv2',
        });
        const raw = await call('reverse', `${NOMINATIM}/reverse?${query}`, deadline);
        if (raw === undefined) {
          results.push(null);
          continue;
        }
        const places = parsePlaces(raw).slice(0, 1);
        await deps.cachePut(key, { places });
        cached.set(key, { places });
        results.push(places[0] ?? null);
      }
      return results;
    },

    /** Up to 5 towns matching what the person typed (submit only, never as they type). */
    async searchPlaces(text: string, budgetMs = 5000): Promise<GeoPlace[]> {
      const key = searchKey(text);
      const hit = (await deps.cacheGet([key])).get(key);
      if (hit) return hit.places;
      const query = new URLSearchParams({
        q: text.trim(),
        featureType: 'settlement',
        limit: '5',
        addressdetails: '1',
        'accept-language': 'en',
        format: 'jsonv2',
      });
      const raw = await call('search', `${NOMINATIM}/search?${query}`, deps.now() + budgetMs);
      if (raw === undefined) return [];
      const places = parsePlaces(raw).slice(0, 5);
      await deps.cachePut(key, { places });
      return places;
    },
  };
}
