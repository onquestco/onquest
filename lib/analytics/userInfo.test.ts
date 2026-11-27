import { describe, expect, it, vi } from 'vitest';
import {
  accessTokenFromCookies,
  buildUserInfo,
  cachedSession,
  geoFrom,
  sessionCacheSize,
  userInfoAllowed,
  UserInfoSchema,
} from './userInfo';

// vi.mock is hoisted above the imports. userInfo.ts is server-only and reads next/headers;
// these tests call its pure parts and pass cookies and headers in.
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

const KEY = '0f8c06e0-ff8e-4996-ada5-c17de627ae88';
const OTHER = '5b0b7c6e-8a39-4a4e-9a57-3f1e1d7c2b10';
const session = { userKey: KEY, email: 'riya@example.com', handle: 'riya' };
const geoHeaders = new Headers({
  'x-vercel-ip-country': 'IN',
  'x-vercel-ip-country-region': 'KA',
  'x-vercel-ip-city': 'Bengaluru',
  'x-forwarded-for': '1.2.3.4',
});

describe('userInfoAllowed (ANALYTICS_USER_INFO)', () => {
  it('off when unset or off', () => {
    expect(userInfoAllowed(KEY, {})).toBe(false);
    expect(userInfoAllowed(KEY, { ANALYTICS_USER_INFO: 'off' })).toBe(false);
    expect(userInfoAllowed(KEY, { ANALYTICS_USER_INFO: 'yes' })).toBe(false);
  });

  it('team: only the listed keys', () => {
    const env = { ANALYTICS_USER_INFO: 'team', ANALYTICS_USER_INFO_TEAM_KEYS: ` ${KEY} , abc` };
    expect(userInfoAllowed(KEY, env)).toBe(true);
    expect(userInfoAllowed(OTHER, env)).toBe(false);
    expect(userInfoAllowed(KEY, { ANALYTICS_USER_INFO: 'team' })).toBe(false);
  });

  it('on: everyone signed in', () => {
    expect(userInfoAllowed(OTHER, { ANALYTICS_USER_INFO: 'on' })).toBe(true);
  });
});

describe('buildUserInfo', () => {
  const on = { ANALYTICS_USER_INFO: 'on' };

  it('is the session’s own geo, handle and email', () => {
    const info = buildUserInfo(session, KEY, geoHeaders, on);
    expect(info).toEqual({
      geoip: { country: 'IN', region: 'KA', city: 'Bengaluru' },
      username: 'riya',
      email_id: 'riya@example.com',
    });
    expect(UserInfoSchema.parse(info)).toEqual(info);
    expect(JSON.stringify(info)).not.toContain('1.2.3.4');
  });

  it('is null when the session user is not the expected key, or signed out, or the gate is off', () => {
    expect(buildUserInfo(session, OTHER, geoHeaders, on)).toBeNull();
    expect(buildUserInfo(null, KEY, geoHeaders, on)).toBeNull();
    expect(buildUserInfo(session, null, geoHeaders, on)).toBeNull();
    expect(buildUserInfo(session, KEY, geoHeaders, {})).toBeNull();
  });

  it('null username before onboarding', () => {
    expect(buildUserInfo({ ...session, handle: null }, KEY, geoHeaders, on)?.username).toBeNull();
  });
});

describe('geoFrom', () => {
  it('URL-decodes the city and stops at city', () => {
    const geo = geoFrom(new Headers({ 'x-vercel-ip-country': 'DE', 'x-vercel-ip-city': 'M%C3%BCnchen' }));
    expect(geo).toEqual({ country: 'DE', region: null, city: 'München' });
  });

  it('drops anything malformed', () => {
    const geo = geoFrom(
      new Headers({
        'x-vercel-ip-country': 'Germany',
        'x-vercel-ip-country-region': 'a-very-long-region',
        'x-vercel-ip-city': '%E0%A4%A',
      }),
    );
    expect(geo).toEqual({ country: null, region: null, city: null });
  });
});

describe('accessTokenFromCookies', () => {
  const json = JSON.stringify({ access_token: 'token-1', refresh_token: 'never-used' });
  const encoded = `base64-${Buffer.from(json).toString('base64url')}`;

  it('reads plain, base64 and chunked auth cookies', () => {
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token', value: json }])).toBe('token-1');
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token', value: encoded }])).toBe('token-1');
    const half = Math.floor(encoded.length / 2);
    expect(
      accessTokenFromCookies([
        { name: 'sb-abc-auth-token.1', value: encoded.slice(half) },
        { name: 'sb-abc-auth-token.0', value: encoded.slice(0, half) },
      ]),
    ).toBe('token-1');
  });

  it('is null without an auth cookie or with junk', () => {
    expect(accessTokenFromCookies([])).toBeNull();
    expect(accessTokenFromCookies([{ name: 'oq_actx', value: 'v1.x' }])).toBeNull();
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token', value: 'base64-!!!' }])).toBeNull();
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token', value: '{"user":1}' }])).toBeNull();
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token-code-verifier', value: json }])).toBeNull();
  });
});

describe('cachedSession', () => {
  it('looks a token up once per 60 s', async () => {
    const lookup = vi.fn(async () => session);
    await cachedSession('cache-a', lookup, 0);
    await cachedSession('cache-a', lookup, 59_000);
    expect(lookup).toHaveBeenCalledTimes(1);
    await cachedSession('cache-a', lookup, 61_000);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('remembers signed-out tokens too, and holds at most 1,000 entries', async () => {
    const lookup = vi.fn(async () => null);
    for (let i = 0; i < 1100; i++) await cachedSession(`bound-${i}`, lookup, 0);
    expect(sessionCacheSize()).toBe(1000);
    await cachedSession('bound-1099', lookup, 1);
    expect(lookup).toHaveBeenCalledTimes(1100);
    // The oldest were evicted, so they're looked up again.
    await cachedSession('bound-0', lookup, 1);
    expect(lookup).toHaveBeenCalledTimes(1101);
  });
});
