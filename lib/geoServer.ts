import 'server-only';
import { createGeocoder, type GeoPlace } from './geo';
import { createAdminSupabase } from './supabase/admin';

/** The geocoder for one user's request: cache and limiter in Postgres through the service role. */
export function geocoderFor(userKey: string) {
  const admin = createAdminSupabase();
  return createGeocoder({
    fetch,
    async cacheGet(keys) {
      const { data, error } = await admin.rpc('geocode_cache_get', { p_keys: keys });
      if (error) return new Map();
      const rows = (data ?? []) as { cache_key: string; result: { places: GeoPlace[] } }[];
      return new Map(rows.map((row) => [row.cache_key, row.result]));
    },
    async cachePut(key, value) {
      await admin.rpc('geocode_cache_put', { p_key: key, p_result: value });
    },
    async claimSlot(kind) {
      const { data, error } = await admin.rpc('claim_geocoder_slot', { p_user_key: userKey, p_kind: kind });
      return error ? -1 : (data as number);
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    contactEmail: process.env.GEOCODER_CONTACT_EMAIL || undefined,
  });
}
