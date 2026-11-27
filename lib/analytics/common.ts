import { isBot } from './bots';
import { isScreen, type Screen } from './screens';
import { browserFor, osFor, platformFor } from './userAgent';

// The common properties of every v2 event (docs/analytics/v2/common.csv, spec §4.2), one shape
// for browser and server events. Pure: no window, no request. client.ts, server.ts and
// ingestEnrich.ts fill them from where they run.

export type Env = 'production' | 'preview';
export type Platform = 0 | 1;

export const ANON_ID = /^anon_[0-9a-f-]{36}$/;
const UUID_LIKE = /^[0-9a-f-]{36}$/;
const APP_VERSION = /^([0-9a-f]{7}|dev)$/;

/** VERCEL_ENV / NEXT_PUBLIC_VERCEL_ENV: only "production" is production; local dev is preview. */
export function analyticsEnv(vercelEnv: string | undefined): Env {
  return vercelEnv === 'production' ? 'production' : 'preview';
}

export function appVersion(commitSha: string | undefined): string {
  return commitSha?.slice(0, 7) || 'dev';
}

// oq_actx (spec §4.2): v1.<anon_id>.<session_id>.<screen>.<platform>. Written by the browser
// only when NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE=on; nothing in it identifies the person.
export const CONTEXT_COOKIE = 'oq_actx';
const CONTEXT_COOKIE_VALUE = /^v1\.anon_[0-9a-f-]{36}\.[0-9a-f-]{36}\.[a-z_]{2,20}\.[01]$/;

export type DeviceContext = { anonId: string; sessionId: string; screen: Screen; platform: Platform };

export function contextCookieEnabled(flag: string | undefined): boolean {
  return flag === 'on';
}

export function contextCookieValue(context: DeviceContext): string {
  return ['v1', context.anonId, context.sessionId, context.screen, context.platform].join('.');
}

/** The cookie's context, or null when it's missing or doesn't match the exact shape. */
export function parseContextCookie(value: string | undefined): DeviceContext | null {
  if (!value || !CONTEXT_COOKIE_VALUE.test(value)) return null;
  const [, anonId = '', sessionId = '', screen, platform] = value.split('.');
  if (!isScreen(screen)) return null;
  return { anonId, sessionId, screen, platform: platform === '0' ? 0 : 1 };
}

// Browser side --------------------------------------------------------------------------------

export type BrowserCommonInput = {
  eventId: string;
  type: 'click' | 'view' | 'client';
  anonId: string;
  sessionId: string;
  now: Date;
  coarsePointer: boolean;
  appVersion: string;
  env: Env;
  screen: Screen;
};

/** What the browser sends itself. Identity, user_info, os/browser, country and the bot flag are /ingest's. */
export function browserCommon(input: BrowserCommonInput) {
  return {
    event_id: input.eventId,
    type: input.type,
    anon_id: input.anonId,
    session_id: input.sessionId,
    client_ts: input.now.toISOString(),
    platform: (input.coarsePointer ? 0 : 1) as Platform,
    app_version: input.appVersion,
    env: input.env,
    screen: input.screen,
  };
}

// Server side (/ingest and trackServer) ---------------------------------------------------------

type HeaderReader = { get(name: string): string | null };

/** What the request tells us about the device and place: never the IP. */
export function requestFacts(headers: HeaderReader) {
  const userAgent = headers.get('user-agent') ?? '';
  const country = headers.get('x-vercel-ip-country')?.toUpperCase() ?? '';
  return {
    os: osFor(userAgent),
    browser: browserFor(userAgent),
    platform: platformFor(userAgent) as Platform,
    is_bot_flg: isBot(userAgent, false),
    country: /^[A-Z]{2}$/.test(country) ? country : null,
  };
}

/** The browser's own common properties that /ingest keeps, each only in its exact shape. */
export function trustedBrowserCommon(properties: Record<string, unknown>) {
  const kept: Record<string, string | number> = {};
  const { event_id, anon_id, session_id, client_ts, platform, app_version, screen } = properties;
  if (typeof event_id === 'string' && UUID_LIKE.test(event_id)) kept.event_id = event_id;
  if (typeof anon_id === 'string' && ANON_ID.test(anon_id)) kept.anon_id = anon_id;
  if (typeof session_id === 'string' && UUID_LIKE.test(session_id)) kept.session_id = session_id;
  if (typeof client_ts === 'string' && client_ts.length <= 40 && !Number.isNaN(Date.parse(client_ts))) {
    kept.client_ts = client_ts;
  }
  if (platform === 0 || platform === 1) kept.platform = platform;
  if (typeof app_version === 'string' && APP_VERSION.test(app_version)) kept.app_version = app_version;
  if (isScreen(screen)) kept.screen = screen;
  return kept;
}
