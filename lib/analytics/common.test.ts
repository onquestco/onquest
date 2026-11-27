import { describe, expect, it } from 'vitest';
import {
  analyticsEnv,
  appVersion,
  browserCommon,
  contextCookieEnabled,
  contextCookieValue,
  parseContextCookie,
  requestFacts,
  trustedBrowserCommon,
} from './common';
import { COMMON_PROPERTIES } from './taxonomy';

const ANON = 'anon_0f8c06e0-ff8e-4996-ada5-c17de627ae88';
const SESSION = '5b0b7c6e-8a39-4a4e-9a57-3f1e1d7c2b10';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

describe('common properties', () => {
  it('env: only production is production; local dev and preview are preview', () => {
    expect(analyticsEnv('production')).toBe('production');
    expect(analyticsEnv('preview')).toBe('preview');
    expect(analyticsEnv('development')).toBe('preview');
    expect(analyticsEnv(undefined)).toBe('preview');
  });

  it('app_version is the short sha', () => {
    expect(appVersion('f3378f5a1b2c3d4e')).toBe('f3378f5');
    expect(appVersion(undefined)).toBe('dev');
  });

  it('the browser sends only common.csv properties, and no identity or user_info', () => {
    const common = browserCommon({
      eventId: SESSION,
      type: 'click',
      anonId: ANON,
      sessionId: SESSION,
      now: new Date('2026-11-27T10:00:00Z'),
      coarsePointer: true,
      appVersion: 'f3378f5',
      env: 'preview',
      screen: 'home',
    });
    expect(common).toEqual({
      event_id: SESSION,
      type: 'click',
      anon_id: ANON,
      session_id: SESSION,
      client_ts: '2026-11-27T10:00:00.000Z',
      platform: 0,
      app_version: 'f3378f5',
      env: 'preview',
      screen: 'home',
    });
    for (const name of Object.keys(common)) expect(COMMON_PROPERTIES).toContain(name);
    expect(common).not.toHaveProperty('user_id');
    expect(common).not.toHaveProperty('user_info');
  });

  it('request facts: device from the user agent, country from Vercel, never the IP', () => {
    const headers = new Headers({ 'user-agent': IPHONE, 'x-vercel-ip-country': 'in', 'x-forwarded-for': '1.2.3.4' });
    const facts = requestFacts(headers);
    expect(facts).toEqual({ os: 'ios', browser: 'safari', platform: 0, is_bot_flg: false, country: 'IN' });
    expect(JSON.stringify(facts)).not.toContain('1.2.3.4');
    expect(requestFacts(new Headers({ 'user-agent': 'facebookexternalhit/1.1' })).is_bot_flg).toBe(true);
    expect(requestFacts(new Headers({ 'x-vercel-ip-country': 'India' })).country).toBeNull();
  });

  it('keeps only well-formed browser common properties', () => {
    expect(
      trustedBrowserCommon({
        event_id: SESSION,
        anon_id: ANON,
        session_id: SESSION,
        client_ts: '2026-11-27T10:00:00.000Z',
        platform: 1,
        app_version: 'f3378f5',
        screen: 'quest_page',
        user_id: 'someone-else',
        user_info: { email_id: 'a@b.co' },
        country: 'US',
      }),
    ).toEqual({
      event_id: SESSION,
      anon_id: ANON,
      session_id: SESSION,
      client_ts: '2026-11-27T10:00:00.000Z',
      platform: 1,
      app_version: 'f3378f5',
      screen: 'quest_page',
    });
    expect(
      trustedBrowserCommon({ anon_id: 'anon_x', screen: 'unknown', platform: 'web_mobile', app_version: 'v1 <b>' }),
    ).toEqual({});
  });
});

describe('oq_actx cookie', () => {
  const context = { anonId: ANON, sessionId: SESSION, screen: 'create_review' as const, platform: 1 as const };

  it('is off unless the flag is exactly "on"', () => {
    expect(contextCookieEnabled(undefined)).toBe(false);
    expect(contextCookieEnabled('off')).toBe(false);
    expect(contextCookieEnabled('true')).toBe(false);
    expect(contextCookieEnabled('on')).toBe(true);
  });

  it('round-trips, and anything not in the exact shape is ignored', () => {
    const value = contextCookieValue(context);
    expect(value).toBe(`v1.${ANON}.${SESSION}.create_review.1`);
    expect(parseContextCookie(value)).toEqual(context);
    expect(parseContextCookie(undefined)).toBeNull();
    expect(parseContextCookie(`v2.${ANON}.${SESSION}.home.1`)).toBeNull();
    expect(parseContextCookie(`v1.${ANON}.${SESSION}.home.2`)).toBeNull();
    expect(parseContextCookie(`v1.anon_x.${SESSION}.home.1`)).toBeNull();
    expect(parseContextCookie(`v1.${ANON}.${SESSION}.not_a_screen.1`)).toBeNull();
    expect(parseContextCookie(`v1.${ANON}.${SESSION}.home.1.riya@example.com`)).toBeNull();
  });
});
