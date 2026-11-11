import { describe, expect, it } from 'vitest';
import { isBot } from './bots';
import { anonId, sessionId } from './ids';
import { downstreamHeaders, upstreamHeaders, upstreamUrl } from './ingestProxy';
import { routeTemplate } from './routeTemplate';

describe('routeTemplate', () => {
  it('never keeps a handle, slug or key', () => {
    expect(routeTemplate('/@riya/goa-k3f9x2')).toBe('/@[handle]/[slug]');
    expect(routeTemplate('/@riya')).toBe('/@[handle]');
    expect(routeTemplate('/@riya/followers')).toBe('/@[handle]/followers');
    expect(routeTemplate('/quests/0f8c06e0-ff8e-4996-ada5-c17de627ae88/review')).toBe('/quests/[key]/review');
    expect(routeTemplate('/guides/goa-in-3-days')).toBe('/guides/[slug]');
    expect(routeTemplate('/home')).toBe('/home');
    expect(routeTemplate('/something/else')).toBe('/[other]');
  });
});

describe('ingest proxy', () => {
  it('never forwards referer, cookies or auth', () => {
    const incoming = new Headers({
      referer: 'https://onquest.in/@riya/secret-k3f9x2',
      cookie: 'sb-access-token=abc',
      authorization: 'Bearer abc',
      'content-type': 'application/json',
      'x-forwarded-for': '1.2.3.4, 10.0.0.1',
    });
    const headers = upstreamHeaders(incoming);
    expect(headers.get('referer')).toBeNull();
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('x-forwarded-for')).toBe('1.2.3.4');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('passes no cookies back', () => {
    const upstream = new Headers({ 'set-cookie': 'ph=1', 'content-type': 'text/plain' });
    expect(downstreamHeaders(upstream).get('set-cookie')).toBeNull();
  });

  it('reaches only capture paths on PostHog', () => {
    expect(upstreamUrl('us.i.posthog.com', ['i', 'v0', 'e'], '')).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(upstreamUrl('us.i.posthog.com', ['api', 'projects'], '')).toBeNull();
  });
});

describe('ids', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
  };

  it('keeps one anon id per device', () => {
    const storage = memory();
    expect(anonId(storage, () => 'a')).toBe('anon_a');
    expect(anonId(storage, () => 'b')).toBe('anon_a');
  });

  it('starts a new session after 30 minutes idle', () => {
    const storage = memory();
    let n = 0;
    const next = () => `s${++n}`;
    const first = sessionId(storage, next, 0);
    expect(sessionId(storage, next, 29 * 60_000)).toBe(first);
    expect(sessionId(storage, next, 60 * 60_000)).not.toBe(first);
  });
});

describe('isBot', () => {
  it('drops link-preview bots and headless browsers', () => {
    expect(isBot('WhatsApp/2.23', false)).toBe(true);
    expect(isBot('facebookexternalhit/1.1', false)).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone) Safari', true)).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone) Safari', false)).toBe(false);
  });
});
