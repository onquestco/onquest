import { describe, expect, it } from 'vitest';
import { expectNoProblems } from './validate';
import { appOpenedProperties, entryTypeFor, readSrc, withoutSrc, withSrc } from './src';

describe('?src= tags', () => {
  it('adds the tag and keeps the rest of the link', () => {
    expect(withSrc('/@riya/goa-k3f9x2', 1)).toBe('/@riya/goa-k3f9x2?src=1');
    expect(withSrc('/@riya/goa-k3f9x2?ref=abc#page-2', 3)).toBe('/@riya/goa-k3f9x2?ref=abc&src=3#page-2');
    expect(withSrc('/@riya?src=2', 5)).toBe('/@riya?src=5');
    expect(withSrc('https://onquest.in/@riya/blog/x', 'email')).toBe('https://onquest.in/@riya/blog/x?src=email');
  });

  it('reads only plain codes', () => {
    expect(readSrc('?src=4')).toBe(4);
    expect(readSrc('?src=email')).toBe('email');
    expect(readSrc('?src=<script>')).toBeNull();
    expect(readSrc('?src=123')).toBeNull();
    expect(readSrc('')).toBeNull();
  });

  it('is removed from the address bar, other query kept', () => {
    expect(withoutSrc('?src=4')).toBe('');
    expect(withoutSrc('?ref=abc&src=4')).toBe('?ref=abc');
  });
});

describe('app_opened', () => {
  const base = {
    template: '/home',
    src: null,
    externalReferrer: false,
    signedInHint: false,
    firstOpen: false,
    utmSource: null,
  };

  it('entry_type: email, shared link, other site, default', () => {
    expect(entryTypeFor({ ...base, template: '/@[handle]/[slug]', src: 'email' })).toBe(2);
    expect(entryTypeFor({ ...base, template: '/@[handle]/[slug]' })).toBe(1);
    expect(entryTypeFor({ ...base, template: '/@[handle]/blog/[slug]', externalReferrer: true })).toBe(1);
    expect(entryTypeFor({ ...base, template: '/@[handle]/[slug]', src: 1 })).toBe(0);
    expect(entryTypeFor({ ...base, externalReferrer: true })).toBe(4);
    expect(entryTypeFor(base)).toBe(0);
  });

  it('has every required property on the sheet’s landing pages', () => {
    const properties = appOpenedProperties({ ...base, template: '/@[handle]/[slug]', firstOpen: true });
    expect(properties).toEqual({
      landing_page: 1,
      entry_type: 1,
      signed_in_flg: false,
      first_open_flg: true,
      utm_source: undefined,
    });
    expectNoProblems('app_opened', { ...properties, landing_page: 1 });
    expectNoProblems('app_opened', { ...appOpenedProperties({ ...base, utmSource: 'whatsapp' }), landing_page: 0 });
  });

  it('leaves landing_page out for pages outside 0–6 (still sent)', () => {
    expect(appOpenedProperties({ ...base, template: '/guides/[slug]' }).landing_page).toBeUndefined();
  });
});
