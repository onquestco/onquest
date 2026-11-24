import { describe, expect, it } from 'vitest';
import { BlogPlaceSchema } from '@/lib/blog/schema';
import { toBlogPlace } from './blogPlace';

const goa = {
  name: 'Goa',
  detail: 'India',
  lat: 15.3,
  lng: 74.1,
  geoRef: 'R11251493',
  city: 'Panaji',
  countryCode: 'IN',
};

describe('toBlogPlace', () => {
  it('keeps the name and where it is, never the coordinates', () => {
    const place = toBlogPlace(goa);
    expect(place).toEqual({ name: 'Goa', city: 'Panaji', countryCode: 'IN', geoRef: 'R11251493' });
    expect(JSON.stringify(place)).not.toMatch(/lat|lng/);
    expect(BlogPlaceSchema.parse(place)).toEqual(place);
  });

  it('leaves out what the geocoder didn\'t give', () => {
    const place = toBlogPlace({ ...goa, city: null, countryCode: null, geoRef: null });
    expect(place).toEqual({ name: 'Goa' });
  });
});
