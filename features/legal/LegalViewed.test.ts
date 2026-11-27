import { describe, expect, it } from 'vitest';
import { expectNoProblems } from '@/lib/analytics/validate';
import { legalViewedProperties } from './LegalViewed';

describe('legal_page_viewed', () => {
  it('sends the page and where the person came from as codes', () => {
    expect(legalViewedProperties('privacy', 'sign_in')).toEqual({ page: 0, source: 0 });
    expect(legalViewedProperties('terms', 'settings')).toEqual({ page: 1, source: 1 });
    expect(legalViewedProperties('privacy', 'footer')).toEqual({ page: 0, source: 2 });
  });

  it('anything else, or nothing, is direct', () => {
    expect(legalViewedProperties('terms', null).source).toBe(3);
    expect(legalViewedProperties('terms', 'https://example.com').source).toBe(3);
  });

  it('is valid for the taxonomy', () => {
    for (const from of ['sign_in', 'settings', 'footer', null]) {
      expectNoProblems('legal_page_viewed', legalViewedProperties('privacy', from));
      expectNoProblems('legal_page_viewed', legalViewedProperties('terms', from));
    }
  });
});
