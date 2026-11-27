import { ANON_ID, requestFacts, trustedBrowserCommon, type Env } from './common';
import { batchUrl, downstreamHeaders, isCapturePath, readBodyUpTo, upstreamHeaders } from './ingestProxy';
import { routeTemplate } from './routeTemplate';
import { EVENTS, type EventName } from './taxonomy';
import { CLIENT_EVENTS as V1_EVENTS } from './taxonomyV1';
import { keepAllowed, validateProperties, type EventProperties } from './validate';
import type { Taxonomy } from './taxonomyFromCsv';
import type { UserInfo } from './userInfo';

// /ingest is the only trust boundary for browser events (docs/specs/analytics-v2.md §3.2). The
// browser says what happened; this decides who it happened to (the verified session, else the
// body's anon id), and sets user_info, env, os/browser, country and the bot flag itself. The
// session lookup and user_info come in from app/ingest/[...path]/route.ts (userInfo.ts is
// server-only), so everything here runs in a unit test.

export const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 100;
const MERGE_EVENTS = new Set(['$identify', '$create_alias', '$merge_dangerously']);

type HeaderReader = { get(name: string): string | null };
type RawEvent = { event: string; properties: Record<string, unknown> };
export type OutEvent = { event: string; distinct_id: string; properties: Record<string, unknown> };

/**
 * The events in a body, or null when it must not be forwarded at all: compressed (header or
 * ?compression=), over 64 KB, not JSON, or not an event / batch. Only foreign senders hit this:
 * client.ts never compresses.
 */
export function parseIngestBody(
  body: Uint8Array | null,
  request: { contentEncoding: string | null; search: string },
): RawEvent[] | null {
  if (request.contentEncoding) return null;
  if (new URLSearchParams(request.search).has('compression')) return null;
  if (!body || body.byteLength === 0 || body.byteLength > MAX_BODY_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    return null;
  }
  const list: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : isObject(parsed) && Array.isArray(parsed.batch)
      ? parsed.batch
      : isObject(parsed) && 'event' in parsed
        ? [parsed]
        : null;
  if (!list || list.length === 0 || list.length > MAX_EVENTS) return null;
  return list.flatMap((item) =>
    isObject(item) && typeof item.event === 'string'
      ? [{ event: item.event, properties: isObject(item.properties) ? item.properties : {} }]
      : [],
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** (anon id, user key) pairs this instance merged in the last 24 hours. LRU, 10,000 pairs. */
export class MergeMemory {
  private readonly seen = new Map<string, number>();
  private readonly max: number;
  private readonly ttlMs: number;

  constructor(max = 10_000, ttlMs = 24 * 60 * 60 * 1000) {
    this.max = max;
    this.ttlMs = ttlMs;
  }

  /** True the first time a pair is seen (or once it has expired), and remembers it. */
  isNew(anonId: string, userKey: string, now: number): boolean {
    const pair = `${anonId}|${userKey}`;
    const at = this.seen.get(pair);
    this.seen.delete(pair);
    if (at !== undefined && now - at < this.ttlMs) {
      this.seen.set(pair, at);
      return false;
    }
    this.seen.set(pair, now);
    while (this.seen.size > this.max) {
      const oldest = this.seen.keys().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }
    return true;
  }
}

export type EnrichContext = {
  /** The verified session's user key, or null when signed out. */
  userKey: string | null;
  userInfo: UserInfo;
  headers: HeaderReader;
  env: Env;
  merged: MergeMemory;
  now: number;
};

/** Only the event's own properties, from the v2 rules, the frozen v1 rules or $pageview's. */
function ownProperties(event: string, properties: Record<string, unknown>): Record<string, unknown> | null {
  if (Object.hasOwn(EVENTS, event)) {
    const rules = EVENTS[event as EventName].properties;
    const own = Object.fromEntries(Object.entries(properties).filter(([name]) => name in rules));
    return { ...validateProperties(rules, own).properties, type: EVENTS[event as EventName].type };
  }
  if (event === '$pageview') {
    const template = routeTemplate(typeof properties.$pathname === 'string' ? properties.$pathname : '/');
    return { $pathname: template, $current_url: `https://onquest.in${template}`, type: 'view' };
  }
  // Old tabs and rolled-back releases (§3.5): v1 names keep their v1 properties.
  if (Object.hasOwn(V1_EVENTS, event)) {
    const rules: Taxonomy[string] = V1_EVENTS[event as keyof typeof V1_EVENTS];
    return keepAllowed(rules, properties as EventProperties);
  }
  return null;
}

/** v1 bodies send platform and screen as strings; they're kept as they were for events_clean. */
function v1Common(properties: Record<string, unknown>) {
  const kept: Record<string, string> = {};
  if (properties.platform === 'web_mobile' || properties.platform === 'web_desktop') {
    kept.platform = properties.platform;
  }
  if (typeof properties.screen === 'string' && /^[a-z_]{1,30}$/.test(properties.screen)) {
    kept.screen = properties.screen;
  }
  return kept;
}

/** The events to forward to PostHog, re-keyed and enriched. Dropped events are simply left out. */
export function enrichEvents(events: RawEvent[], context: EnrichContext): OutEvent[] {
  const facts = requestFacts(context.headers);
  const serverSet = {
    user_id: context.userKey,
    user_info: context.userKey ? context.userInfo : null,
    is_bot_flg: facts.is_bot_flg,
    env: context.env,
    os: facts.os,
    browser: facts.browser,
    country: facts.country,
    // PostHog mustn't look up a location of its own: geo stops at Vercel's country/region/city.
    $geoip_disable: true,
  };
  const out: OutEvent[] = [];
  for (const { event, properties } of events) {
    if (MERGE_EVENTS.has(event)) continue;
    const own = ownProperties(event, properties);
    if (!own) continue;
    const common = trustedBrowserCommon(properties);
    const distinctId = context.userKey ?? (common.anon_id as string | undefined);
    if (!distinctId) continue;

    const anonId = common.anon_id;
    if (context.userKey && typeof anonId === 'string' && ANON_ID.test(anonId)) {
      if (context.merged.isNew(anonId, context.userKey, context.now)) {
        // The only identify() in the system (spec D2). Repeats are no-ops in PostHog.
        out.push({
          event: '$identify',
          distinct_id: context.userKey,
          properties: { $anon_distinct_id: anonId, env: context.env, $geoip_disable: true },
        });
      }
    }

    const isV1 = !Object.hasOwn(EVENTS, event) && event !== '$pageview';
    const device = isV1
      ? { ...common, platform: undefined, screen: undefined, ...v1Common(properties) }
      : { ...common, platform: common.platform ?? facts.platform };
    out.push({
      event,
      distinct_id: distinctId,
      properties: {
        ...own,
        ...device,
        ...serverSet,
        // The browser only guesses; the verified session decides.
        ...(event === 'app_opened' ? { signed_in_flg: context.userKey !== null } : {}),
      },
    });
  }
  return out;
}

export type IngestDeps = {
  /** NEXT_PUBLIC_POSTHOG_KEY: unset, nothing is forwarded. */
  apiKey: string | undefined;
  host: string;
  env: Env;
  merged: MergeMemory;
  /** The verified session's user key (userInfo.ts), looked up only for a body worth forwarding. */
  sessionUserKey: (request: Request) => Promise<string | null>;
  userInfo: (userKey: string, request: Request) => UserInfo;
  send: typeof fetch;
  now: () => number;
};

const notForwarded = () => new Response(null, { status: 204 });

/** POST /ingest/<capture path>: checked, re-keyed, enriched and sent to PostHog as one batch. */
export async function handleIngest(request: Request, path: string[], deps: IngestDeps): Promise<Response> {
  if (!isCapturePath(path)) return new Response(null, { status: 404 });
  if (!deps.apiKey || request.method !== 'POST') return notForwarded();
  try {
    const events = parseIngestBody(await readBodyUpTo(request, MAX_BODY_BYTES), {
      contentEncoding: request.headers.get('content-encoding'),
      search: new URL(request.url).search,
    });
    if (!events) return notForwarded();
    const userKey = await deps.sessionUserKey(request);
    const batch = enrichEvents(events, {
      userKey,
      userInfo: userKey ? deps.userInfo(userKey, request) : null,
      headers: request.headers,
      env: deps.env,
      merged: deps.merged,
      now: deps.now(),
    });
    if (batch.length === 0) return notForwarded();
    const upstream = await deps.send(batchUrl(deps.host), {
      method: 'POST',
      headers: upstreamHeaders(request.headers),
      body: JSON.stringify({ api_key: deps.apiKey, batch }),
    });
    return new Response(upstream.body, { status: upstream.status, headers: downstreamHeaders(upstream.headers) });
  } catch {
    return new Response(null, { status: 502 });
  }
}
