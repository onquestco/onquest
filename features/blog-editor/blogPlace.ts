import type { BlogPlace } from '@/lib/blog/schema';
import type { GeoPlace } from '@/lib/geo';

// "Add a place" (S1): the blog keeps the place's name and where it is, never coordinates
// (spec §7). The geocoder's lat/lng stop here.

const COUNTRY_CODE = /^[A-Z]{2}$/;

export function toBlogPlace(place: GeoPlace): BlogPlace {
  const name = [...place.name.trim()].slice(0, 60).join('');
  const city = place.city ? [...place.city].slice(0, 100).join('') : undefined;
  return {
    name,
    ...(city ? { city } : {}),
    ...(place.countryCode && COUNTRY_CODE.test(place.countryCode) ? { countryCode: place.countryCode } : {}),
    ...(place.geoRef && place.geoRef.length <= 200 ? { geoRef: place.geoRef } : {}),
  };
}
