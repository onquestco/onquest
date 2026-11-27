import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { handleIngest, MAX_BODY_BYTES, MergeMemory, type IngestDeps, type OutEvent } from './ingestEnrich';

// /ingest, the trust boundary (docs/specs/analytics-v2.md §3.2, §11).

const KEY = '0f8c06e0-ff8e-4996-ada5-c17de627ae88';
const SOMEONE_ELSE = '5b0b7c6e-8a39-4a4e-9a57-3f1e1d7c2b10';
const ANON = 'anon_11111111-2222-4333-8444-555555555555';
const OTHER_ANON = 'anon_aaaaaaaa-2222-4333-8444-555555555555';
const SESSION_ID = '66666666-7777-4888-9999-000000000000';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const USER_INFO = { geoip: { country: 'IN', region: 'KA', city: 'Bengaluru' }, username: 'riya', email_id: 'r@x.in' };

const common = {
  event_id: '99999999-8888-4777-8666-555555555555',
  anon_id: ANON,
  session_id: SESSION_ID,
  client_ts: '2026-11-27T10:00:00.000Z',
  platform: 0,
  app_version: 'f3378f5',
  screen: 'blog_page',
  env: 'production', // the browser's claim; the server's VERCEL_ENV wins
};
const blogViewed = {
  event: 'blog_viewed',
  properties: { ...common, blog_id: 'b-1', view_id: 'v-1', signed_in_flg: true, referrer: 0, has_quest_flg: false },
};

type Setup = { userKey?: string | null; merged?: MergeMemory };

function setup({ userKey = null, merged = new MergeMemory() }: Setup = {}) {
  const sent: { url: string; init: RequestInit }[] = [];
  const deps: IngestDeps = {
    apiKey: 'phc_ours',
    host: 'us.i.posthog.com',
    env: 'preview',
    merged,
    sessionUserKey: vi.fn(async () => userKey),
    userInfo: (key) => (key === KEY ? USER_INFO : null),
    send: vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({ url: String(url), init: init ?? {} });
      return new Response('{"status":1}', { status: 200, headers: { 'set-cookie': 'ph=1' } });
    }) as unknown as typeof fetch,
    now: () => 1_000,
  };
  const batch = () => {
    const body = JSON.parse(String(sent[0]?.init.body ?? '{}')) as { api_key?: string; batch?: OutEvent[] };
    return body.batch ?? [];
  };
  return { deps, sent, batch };
}

function post(body: unknown, init: { headers?: Record<string, string>; search?: string; raw?: BodyInit } = {}) {
  return new Request(`https://onquest.in/ingest/i/v0/e/${init.search ?? ''}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': IPHONE,
      'x-forwarded-for': '1.2.3.4, 10.0.0.1',
      'x-vercel-ip-country': 'IN',
      referer: 'https://onquest.in/@riya/secret-k3f9x2',
      cookie: 'sb-abc-auth-token=secret',
      ...init.headers,
    },
    body: init.raw ?? JSON.stringify(body),
  });
}

const PATH = ['i', 'v0', 'e'];

describe('identity', () => {
  it('distinct_id and user_id come from the session; a body claiming another key is re-keyed', async () => {
    const { deps, batch } = setup({ userKey: KEY });
    const spoofed = { ...blogViewed, distinct_id: SOMEONE_ELSE, properties: { ...blogViewed.properties, user_id: SOMEONE_ELSE } };
    expect((await handleIngest(post(spoofed), PATH, deps)).status).toBe(200);
    const event = batch().find((item) => item.event === 'blog_viewed');
    expect(event?.distinct_id).toBe(KEY);
    expect(event?.properties.user_id).toBe(KEY);
    expect(JSON.stringify(batch())).not.toContain(SOMEONE_ELSE);
  });

  it('signed out: the body’s anon_id, user_id null', async () => {
    const { deps, batch } = setup();
    await handleIngest(post(blogViewed), PATH, deps);
    expect(batch()).toHaveLength(1);
    expect(batch()[0]).toMatchObject({ distinct_id: ANON, properties: { user_id: null, user_info: null } });
  });

  it('no session and no valid anon_id: dropped', async () => {
    const { deps, sent } = setup();
    const noAnon = { ...blogViewed, properties: { ...blogViewed.properties, anon_id: 'anon_me' } };
    expect((await handleIngest(post(noAnon), PATH, deps)).status).toBe(204);
    expect(sent).toHaveLength(0);
  });

  it('drops browser $identify, $create_alias and $merge_dangerously', async () => {
    const { deps, sent } = setup();
    const merges = ['$identify', '$create_alias', '$merge_dangerously'].map((event) => ({
      event,
      distinct_id: SOMEONE_ELSE,
      properties: { ...common, $anon_distinct_id: ANON, alias: SOMEONE_ELSE },
    }));
    expect((await handleIngest(post({ batch: merges }), PATH, deps)).status).toBe(204);
    expect(sent).toHaveLength(0);
  });

  it('emits one $identify per new (anon, key) pair', async () => {
    const merged = new MergeMemory();
    const first = setup({ userKey: KEY, merged });
    await handleIngest(post({ batch: [blogViewed, blogViewed] }), PATH, first.deps);
    const identifies = first.batch().filter((item) => item.event === '$identify');
    expect(identifies).toEqual([
      { event: '$identify', distinct_id: KEY, properties: { $anon_distinct_id: ANON, env: 'preview', $geoip_disable: true } },
    ]);
    const again = setup({ userKey: KEY, merged });
    await handleIngest(post(blogViewed), PATH, again.deps);
    expect(again.batch().some((item) => item.event === '$identify')).toBe(false);
    const otherDevice = setup({ userKey: KEY, merged });
    const other = { ...blogViewed, properties: { ...blogViewed.properties, anon_id: OTHER_ANON } };
    await handleIngest(post(other), PATH, otherDevice.deps);
    expect(otherDevice.batch().filter((item) => item.event === '$identify')).toHaveLength(1);
  });

  it('merge memory forgets after 24 hours and holds a bounded number of pairs', () => {
    const memory = new MergeMemory(2, 1000);
    expect(memory.isNew('a', 'k', 0)).toBe(true);
    expect(memory.isNew('a', 'k', 999)).toBe(false);
    expect(memory.isNew('a', 'k', 2000)).toBe(true);
    memory.isNew('b', 'k', 2000);
    memory.isNew('c', 'k', 2000);
    expect(memory.isNew('a', 'k', 2001)).toBe(true); // evicted
  });
});

describe('server-set properties', () => {
  it('user_info, env, os/browser, country, bot flag and $geoip_disable overwrite the browser’s', async () => {
    const { deps, batch } = setup({ userKey: KEY });
    const claims = {
      ...blogViewed,
      properties: {
        ...blogViewed.properties,
        user_info: { email_id: 'fake@evil.com' },
        os: 'windows',
        browser: 'chrome',
        country: 'US',
        is_bot_flg: false,
        $geoip_disable: false,
        $ip: '9.9.9.9',
        $set: { email: 'x' },
        $lib: 'onquest-web',
        $screen_width: 390,
      },
    };
    await handleIngest(post(claims), PATH, deps);
    const event = batch().find((item) => item.event === 'blog_viewed');
    expect(event?.properties).toMatchObject({
      user_info: USER_INFO,
      env: 'preview',
      os: 'ios',
      browser: 'safari',
      country: 'IN',
      is_bot_flg: false,
      $geoip_disable: true,
      type: 'view',
      screen: 'blog_page',
      platform: 0,
    });
    for (const dropped of ['$ip', '$set', '$lib', '$screen_width']) expect(event?.properties).not.toHaveProperty(dropped);
    expect(JSON.stringify(batch())).not.toContain('fake@evil.com');
  });

  it('flags bots from the user agent', async () => {
    const { deps, batch } = setup();
    await handleIngest(post(blogViewed, { headers: { 'user-agent': 'Mozilla/5.0 HeadlessChrome/131' } }), PATH, deps);
    expect(batch()[0]?.properties.is_bot_flg).toBe(true);
  });

  it('app_opened.signed_in_flg is the verified session, not the browser’s guess', async () => {
    const opened = { event: 'app_opened', properties: { ...common, landing_page: 0, entry_type: 0, signed_in_flg: true, first_open_flg: false } };
    const signedOut = setup();
    await handleIngest(post(opened), PATH, signedOut.deps);
    expect(signedOut.batch()[0]?.properties.signed_in_flg).toBe(false);
    const signedIn = setup({ userKey: KEY });
    await handleIngest(post({ ...opened, properties: { ...opened.properties, signed_in_flg: false } }), PATH, signedIn.deps);
    expect(signedIn.batch().find((item) => item.event === 'app_opened')?.properties.signed_in_flg).toBe(true);
  });

  it('filters to the event’s allowlist and keeps $pageview to the route template', async () => {
    const { deps, batch } = setup();
    const pageview = { event: '$pageview', properties: { ...common, $pathname: '/@riya/secret-k3f9x2', $current_url: 'https://onquest.in/@riya/secret-k3f9x2' } };
    const extra = { ...blogViewed, properties: { ...blogViewed.properties, comment_text: 'hello', blog_id: 'has space' } };
    await handleIngest(post({ batch: [pageview, extra, { event: 'made_up_event', properties: common }] }), PATH, deps);
    expect(batch().map((item) => item.event)).toEqual(['$pageview', 'blog_viewed']);
    expect(batch()[0]?.properties).toMatchObject({ $pathname: '/@[handle]/[slug]', $current_url: 'https://onquest.in/@[handle]/[slug]' });
    expect(JSON.stringify(batch())).not.toContain('secret');
    expect(batch()[1]?.properties).not.toHaveProperty('comment_text');
    expect(batch()[1]?.properties).not.toHaveProperty('blog_id'); // bad value removed, event kept
  });

  it('a v1 body (old tab, rollback) keeps its v1 properties under the same identity rules', async () => {
    const { deps, batch } = setup({ userKey: KEY });
    const v1 = {
      event: 'create_option_tapped',
      distinct_id: SOMEONE_ELSE,
      timestamp: '2026-11-20T10:00:00.000Z',
      properties: { ...common, platform: 'web_mobile', screen: 'unknown', option: 'blog', available: false, $lib: 'onquest-web' },
    };
    await handleIngest(post(v1), PATH, deps);
    const event = batch().find((item) => item.event === 'create_option_tapped');
    expect(event?.distinct_id).toBe(KEY);
    expect(event?.properties).toMatchObject({
      option: 'blog',
      available: false,
      platform: 'web_mobile',
      screen: 'unknown',
      user_id: KEY,
      user_info: USER_INFO,
      env: 'preview',
      $geoip_disable: true,
    });
    expect(event?.properties).not.toHaveProperty('$lib');
    expect(event).not.toHaveProperty('timestamp');
  });
});

describe('bodies that are never forwarded (204)', () => {
  const cases: [string, Request][] = [
    ['gzip header', post(null, { headers: { 'content-encoding': 'gzip' }, raw: new Uint8Array(gzipSync(JSON.stringify(blogViewed))) })],
    ['compression parameter', post(blogViewed, { search: '?compression=gzip-js' })],
    ['oversized', post({ ...blogViewed, padding: 'x'.repeat(MAX_BODY_BYTES) })],
    ['not JSON', post(null, { raw: 'event=blog_viewed' })],
    ['JSON but no event', post({ hello: 'world' })],
    ['empty', post(null, { raw: '' })],
  ];

  it.each(cases)('%s', async (_name, request) => {
    const { deps, sent } = setup({ userKey: KEY });
    expect((await handleIngest(request, PATH, deps)).status).toBe(204);
    expect(sent).toHaveLength(0);
    expect(deps.sessionUserKey).not.toHaveBeenCalled();
  });

  it('a GET (decide/flags) is not forwarded; other PostHog paths are not reachable', async () => {
    const { deps, sent } = setup();
    expect((await handleIngest(new Request('https://onquest.in/ingest/flags/'), ['flags'], deps)).status).toBe(204);
    expect((await handleIngest(post(blogViewed), ['api', 'projects'], deps)).status).toBe(404);
    expect(sent).toHaveLength(0);
  });

  it('nothing is forwarded without a PostHog key', async () => {
    const { deps, sent } = setup();
    expect((await handleIngest(post(blogViewed), PATH, { ...deps, apiKey: undefined })).status).toBe(204);
    expect(sent).toHaveLength(0);
  });
});

describe('forwarding', () => {
  it('sends one batch with our key, without x-forwarded-for, cookies or Referer, and passes no cookie back', async () => {
    const { deps, sent } = setup({ userKey: KEY });
    const response = await handleIngest(post({ ...blogViewed, api_key: 'phc_someone_elses' }), PATH, deps);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe('https://us.i.posthog.com/batch/');
    const headers = new Headers(sent[0]?.init.headers);
    expect(headers.get('x-forwarded-for')).toBeNull();
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('referer')).toBeNull();
    expect(headers.get('content-type')).toBe('application/json');
    expect(String(sent[0]?.init.body)).not.toContain('1.2.3.4');
    expect(JSON.parse(String(sent[0]?.init.body)).api_key).toBe('phc_ours');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
