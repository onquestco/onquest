import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isBot } from './bots';
import { anonId, sessionId } from './ids';
import { batchUrl, downstreamHeaders, isCapturePath, upstreamHeaders } from './ingestProxy';
import { routeTemplate } from './routeTemplate';

const source = (file: string) => readFileSync(join(process.cwd(), 'lib', 'analytics', file), 'utf8');

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

  it('blog pages keep no handle, slug or key either', () => {
    expect(routeTemplate('/@riya/blog/monsoon-in-goa-x1y2z3')).toBe('/@[handle]/blog/[slug]');
    expect(routeTemplate('/blogs/new')).toBe('/blogs/new');
    expect(routeTemplate('/blogs/0f8c06e0-ff8e-4996-ada5-c17de627ae88/edit')).toBe('/blogs/[key]/edit');
    expect(routeTemplate('/blogs/0f8c06e0-ff8e-4996-ada5-c17de627ae88')).toBe('/blogs/[key]');
    expect(routeTemplate('/blogs/not-a-key')).toBe('/[other]');
  });
});

describe('ingest proxy', () => {
  it('never forwards referer, cookies, auth or the client IP', () => {
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
    expect(headers.get('x-forwarded-for')).toBeNull();
    expect([...headers.values()].join(' ')).not.toContain('1.2.3.4');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('passes no cookies back', () => {
    const upstream = new Headers({ 'set-cookie': 'ph=1', 'content-type': 'text/plain' });
    expect(downstreamHeaders(upstream).get('set-cookie')).toBeNull();
  });

  it('reaches only capture paths on PostHog', () => {
    expect(isCapturePath(['i', 'v0', 'e'])).toBe(true);
    expect(isCapturePath(['batch'])).toBe(true);
    expect(isCapturePath(['api', 'projects'])).toBe(false);
    expect(batchUrl('us.i.posthog.com')).toBe('https://us.i.posthog.com/batch/');
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
    expect(anonId(storage, () => 'a')).toEqual({ id: 'anon_a', created: true });
    expect(anonId(storage, () => 'b')).toEqual({ id: 'anon_a', created: false });
  });

  it('starts a new session after 30 minutes idle', () => {
    const storage = memory();
    let n = 0;
    const next = () => `s${++n}`;
    const first = sessionId(storage, next, 0);
    expect(first.created).toBe(true);
    expect(sessionId(storage, next, 29 * 60_000)).toEqual({ id: first.id, created: false });
    const later = sessionId(storage, next, 60 * 60_000);
    expect(later.id).not.toBe(first.id);
    expect(later.created).toBe(true);
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

describe('who decides identity (spec §3.2, §11)', () => {
  it('client.ts sends no user_info, distinct_id claim or $identify, and has no identify()', () => {
    const client = source('client.ts');
    expect(client).not.toMatch(/user_info/);
    expect(client).not.toMatch(/distinct_id\s*:/);
    expect(client).not.toMatch(/\$identify|\$anon_distinct_id/);
    expect(client).not.toMatch(/export function (identify|forgetUser)\b/);
  });

  it('userInfo.ts and server.ts are server-only', () => {
    expect(source('userInfo.ts').startsWith("import 'server-only';")).toBe(true);
    expect(source('server.ts').startsWith("import 'server-only';")).toBe(true);
  });

  it('only server code imports userInfo.ts', () => {
    expect(source('client.ts')).not.toMatch(/from '\.\/userInfo'/);
    expect(source('common.ts')).not.toMatch(/from '\.\/userInfo'/);
    expect(source('ingestEnrich.ts')).toMatch(/import type \{ UserInfo \} from '\.\/userInfo'/);
  });
});
