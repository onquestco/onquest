import { isBot } from './bots';
import { anonId, sessionId } from './ids';
import { routeTemplate } from './routeTemplate';
import { CLIENT_EVENTS, type ClientEventName } from './taxonomy';
import { keepAllowed, propertyProblems, type EventProperties } from './validate';

// Browser analytics (spec A §3.9), sent to PostHog through our own /ingest proxy. Not posthog-js:
// a plain sender has no autocapture, replay, surveys or cookies to switch off, and nothing it
// sends is outside the taxonomy. Does nothing until NEXT_PUBLIC_POSTHOG_KEY is set.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const APP_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';
const ENDPOINT = '/ingest/i/v0/e/';

let screen = 'unknown';
let userKey: string | undefined;

const createId = () => crypto.randomUUID();

function enabled(): boolean {
  return Boolean(KEY) && typeof window !== 'undefined' && !isBot(navigator.userAgent, navigator.webdriver);
}

function common() {
  return {
    event_id: createId(),
    session_id: sessionId(window.localStorage, createId, Date.now()),
    anon_id: anonId(window.localStorage, createId),
    platform: window.matchMedia('(pointer: coarse)').matches ? 'web_mobile' : 'web_desktop',
    app_version: APP_VERSION,
    screen,
    $lib: 'onquest-web',
    $screen_width: window.screen.width,
    $screen_height: window.screen.height,
  };
}

function send(event: string, properties: Record<string, unknown>) {
  const body = JSON.stringify({
    api_key: KEY,
    event,
    distinct_id: userKey ?? properties.anon_id,
    properties,
    timestamp: new Date().toISOString(),
  });
  // A beacon survives the page closing (quest_view_ended on pagehide).
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
  void fetch(ENDPOINT, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'content-type': 'application/json' },
  }).catch(() => undefined);
}

/** The fixed screen name on every event ("quest_page", "review", …). */
export function setScreen(name: string) {
  screen = name;
}

/** One event from the taxonomy. A wrong name, property or value is dropped (and warned in dev). */
export function track(event: ClientEventName, properties: EventProperties = {}) {
  if (!enabled()) return;
  const rules = CLIENT_EVENTS[event];
  const problems = propertyProblems(rules, properties);
  if (problems.length > 0) {
    if (process.env.NODE_ENV !== 'production') console.warn(`Analytics: ${event} dropped`, problems);
    return;
  }
  send(event, { ...keepAllowed(rules, properties), ...common() });
}

/** After sign-in: the user key only, never a name, handle or email. Joins the anon_id's events. */
export function identify(key: string) {
  if (!enabled() || userKey === key) return;
  const properties = common();
  userKey = key;
  send('$identify', { ...properties, $anon_distinct_id: properties.anon_id });
}

export function forgetUser() {
  userKey = undefined;
}

/** A pageview with the route pattern only ("/@[handle]/[slug]"), never the real path. */
export function trackPageview(pathname: string) {
  if (!enabled()) return;
  const template = routeTemplate(pathname);
  send('$pageview', { ...common(), $current_url: `https://onquest.in${template}`, $pathname: template });
}
