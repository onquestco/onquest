import { describe, expect, it, vi } from 'vitest';
import { serverPayload, type ServerRequest } from './server';

// vi.mock is hoisted above the imports. server.ts is server-only and reads next/headers; the
// payload builder is pure, so these tests pass the request in.
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

const KEY = '0f8c06e0-ff8e-4996-ada5-c17de627ae88';
const RECIPIENT = '5b0b7c6e-8a39-4a4e-9a57-3f1e1d7c2b10';
const ANON = 'anon_11111111-2222-4333-8444-555555555555';
const SESSION_ID = '66666666-7777-4888-9999-000000000000';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36';

const headers = new Headers({
  'user-agent': ANDROID,
  'x-vercel-ip-country': 'IN',
  'x-vercel-ip-country-region': 'KA',
  'x-vercel-ip-city': 'Bengaluru',
  'x-forwarded-for': '1.2.3.4',
});
const session = { userKey: KEY, email: 'riya@example.com', handle: 'riya' };
const device = { anonId: ANON, sessionId: SESSION_ID, screen: 'create_preview' as const, platform: 1 as const };
const options = (env: Record<string, string | undefined> = {}) => ({
  now: new Date('2026-11-27T10:00:00Z'),
  createId: () => '99999999-8888-4777-8666-555555555555',
  env: { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'f3378f5abcdef', ...env },
});
const request = (overrides: Partial<ServerRequest> = {}): ServerRequest => ({
  headers,
  session,
  device: null,
  ...overrides,
});
const props = { blog_id: 'b-1', photo_count: 2 };

describe('serverPayload', () => {
  it('cookie off: null anon, session and screen; platform from the user agent', () => {
    const payload = serverPayload('blog_draft_saved', KEY, props, request(), options());
    expect(payload.distinct_id).toBe(KEY);
    expect(payload.timestamp).toBe('2026-11-27T10:00:00.000Z');
    expect(payload.properties).toMatchObject({
      blog_id: 'b-1',
      type: 'server',
      user_id: KEY,
      anon_id: null,
      session_id: null,
      screen: null,
      platform: 0,
      os: 'android',
      browser: 'chrome',
      app_version: 'f3378f5',
      env: 'production',
      country: 'IN',
      is_bot_flg: false,
      user_info: null, // ANALYTICS_USER_INFO unset
      $geoip_disable: true,
    });
    expect(JSON.stringify(payload)).not.toContain('1.2.3.4');
  });

  it('cookie on: anon, session, screen and platform from oq_actx', () => {
    const payload = serverPayload('blog_draft_saved', KEY, props, request({ device }), options());
    expect(payload.properties).toMatchObject({
      anon_id: ANON,
      session_id: SESSION_ID,
      screen: 'create_preview',
      platform: 1,
    });
  });

  it('user_info only for the session’s own user, behind the gate', () => {
    const on = options({ ANALYTICS_USER_INFO: 'on' });
    expect(serverPayload('blog_draft_saved', KEY, props, request(), on).properties.user_info).toEqual({
      geoip: { country: 'IN', region: 'KA', city: 'Bengaluru' },
      username: 'riya',
      email_id: 'riya@example.com',
    });
    const team = options({ ANALYTICS_USER_INFO: 'team', ANALYTICS_USER_INFO_TEAM_KEYS: RECIPIENT });
    expect(serverPayload('blog_draft_saved', KEY, props, request(), team).properties.user_info).toBeNull();
  });

  it('notification_sent: the recipient, with no device ids and no user_info', () => {
    const payload = serverPayload(
      'notification_sent',
      RECIPIENT,
      {},
      request({ device }),
      options({ ANALYTICS_USER_INFO: 'on' }),
    );
    expect(payload.distinct_id).toBe(RECIPIENT);
    expect(payload.properties).toMatchObject({
      user_id: RECIPIENT,
      anon_id: null,
      session_id: null,
      screen: null,
      user_info: null,
    });
  });

  it('account_deleted: a fresh deleted_ distinct id, the key, and nothing that links a device', () => {
    const payload = serverPayload('account_deleted', KEY, {}, request({ device }), options({ ANALYTICS_USER_INFO: 'on' }));
    expect(payload.distinct_id).toMatch(/^deleted_/);
    expect(payload.properties).toMatchObject({ user_id: KEY, anon_id: null, session_id: null, user_info: null });
  });

  it('no session (the unsubscribe link): the link’s key, no device ids, no user_info', () => {
    const payload = serverPayload(
      'setting_changed',
      KEY,
      {},
      request({ session: null, device }),
      options({ ANALYTICS_USER_INFO: 'on' }),
    );
    expect(payload.distinct_id).toBe(KEY);
    expect(payload.properties).toMatchObject({ user_id: KEY, anon_id: null, session_id: null, user_info: null });
  });

  it('is never dropped for a bad property: the bad value is removed', () => {
    const payload = serverPayload('blog_draft_saved', KEY, { blog_id: 'has space', photo_count: 2 }, request(), options());
    expect(payload.event).toBe('blog_draft_saved');
    expect(payload.properties).not.toHaveProperty('blog_id');
    expect(payload.properties).toMatchObject({ photo_count: 2 });
  });

  it('env is preview anywhere but Production', () => {
    expect(serverPayload('blog_draft_saved', KEY, props, request(), options({ VERCEL_ENV: 'preview' })).properties.env).toBe(
      'preview',
    );
    expect(serverPayload('blog_draft_saved', KEY, props, request(), options({ VERCEL_ENV: undefined })).properties.env).toBe(
      'preview',
    );
  });
});
