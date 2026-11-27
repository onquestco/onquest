import { isBot } from './bots';
import {
  analyticsEnv,
  appVersion,
  browserCommon,
  CONTEXT_COOKIE,
  contextCookieEnabled,
  contextCookieValue,
} from './common';
import { anonId, sessionId } from './ids';
import { routeTemplate } from './routeTemplate';
import { fromScreenFor, screenFor, type Screen } from './screens';
import { appOpenedProperties, takeSrc } from './src';
import { EVENTS, type BrowserEventName, type EventProps } from './taxonomy';
import { validateEvent, warnProblems } from './validate';

// Browser analytics (docs/specs/analytics-v2.md §3.2, §4.2), sent to PostHog through our own
// /ingest route, which decides identity, the person's details, os/browser and country. The browser knows
// nothing about who is signed in and claims no distinct id. Not posthog-js: a plain sender has
// no autocapture, replay, surveys or cookies to switch off. Does nothing until
// NEXT_PUBLIC_POSTHOG_KEY is set.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const APP_VERSION = appVersion(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
const ENV = analyticsEnv(process.env.NEXT_PUBLIC_VERCEL_ENV);
// Off until the privacy policy is live (gate G3). Inlined at build time.
const CONTEXT_COOKIE_ON = contextCookieEnabled(process.env.NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE);
const ENDPOINT = '/ingest/i/v0/e/';
const CONTEXT_MAX_AGE_S = 30 * 60;

/** The screen, and the path it was set on: a new path means the route changed before Pageviews ran. */
let current: { screen: Screen; path: string } | undefined;

const createId = () => crypto.randomUUID();

function enabled(): boolean {
  return Boolean(KEY) && typeof window !== 'undefined' && !isBot(navigator.userAgent, navigator.webdriver);
}

/** localStorage, or a page-only stand-in when it's blocked, so a session isn't "new" every event. */
const memory = new Map<string, string>();
function storage(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    window.localStorage.getItem('oq_anon_id');
    return window.localStorage;
  } catch {
    return { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => void memory.set(key, value) };
  }
}

function currentScreen(): Screen {
  const path = window.location.pathname;
  if (!current || current.path !== path) current = { screen: screenFor(routeTemplate(path)), path };
  return current.screen;
}

function post(event: string, properties: Record<string, unknown>) {
  // No distinct_id and no timestamp: /ingest sets the first, PostHog stamps server time.
  const body = JSON.stringify({ api_key: KEY, event, properties });
  // A beacon survives the page closing (quest_view_ended on pagehide).
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
  void fetch(ENDPOINT, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'content-type': 'application/json' },
  }).catch(() => undefined);
}

function writeContextCookie(context: Parameters<typeof contextCookieValue>[0]) {
  if (!CONTEXT_COOKIE_ON) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONTEXT_COOKIE}=${contextCookieValue(context)}; Path=/; SameSite=Lax; Max-Age=${CONTEXT_MAX_AGE_S}${secure}`;
}

/** Common properties for one event; the first event of a new session sends app_opened before it. */
function send(event: string, type: 'click' | 'view' | 'client', properties: Record<string, unknown>) {
  const store = storage();
  const anon = anonId(store, createId);
  const session = sessionId(store, createId, Date.now());
  const screen = currentScreen();
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const common = (eventType: typeof type) =>
    browserCommon({
      eventId: createId(),
      type: eventType,
      anonId: anon.id,
      sessionId: session.id,
      now: new Date(),
      coarsePointer,
      appVersion: APP_VERSION,
      env: ENV,
      screen,
    });
  writeContextCookie({ anonId: anon.id, sessionId: session.id, screen, platform: coarsePointer ? 0 : 1 });
  if (session.created) {
    const opened = appOpened(anon.created);
    post('app_opened', { ...opened, ...common('view') });
  }
  post(event, { ...properties, ...common(type) });
}

/** A Supabase auth cookie is there. Only a hint: /ingest replaces signed_in_flg with the verified session. */
function looksSignedIn(): boolean {
  return /(^|;\s*)sb-(?:\w|-)+-auth-token(\.0)?=/.test(document.cookie);
}

function appOpened(firstOpen: boolean) {
  const referrer = document.referrer;
  let externalReferrer = false;
  try {
    externalReferrer = Boolean(referrer) && new URL(referrer).host !== window.location.host;
  } catch {
    externalReferrer = false;
  }
  const properties = appOpenedProperties({
    template: routeTemplate(window.location.pathname),
    src: takeSrc(),
    externalReferrer,
    signedInHint: looksSignedIn(),
    firstOpen,
    utmSource: new URLSearchParams(window.location.search).get('utm_source'),
  });
  // landing_page is left out for pages outside the sheet's 0–6 (spec §14); still sent.
  const { properties: allowed, problems } = validateEvent('app_opened', properties);
  warnProblems('app_opened', problems);
  return allowed;
}

/** The screen on every following event ("quest_page", "publish", …), until the route changes. */
export function setScreen(screen: Screen) {
  if (typeof window === 'undefined') return;
  current = { screen, path: window.location.pathname };
}

/** create_option_click, tab_click, …: the from_screen code of the page the person is on. */
export function currentFromScreen() {
  return fromScreenFor(typeof window === 'undefined' ? '/' : routeTemplate(window.location.pathname));
}

/**
 * One browser event from the v2 taxonomy (docs/specs/analytics-v2.md §4.2). It is always sent:
 * unknown properties and bad values are removed, and problems are warned in dev by name only.
 */
export function track<Name extends BrowserEventName>(event: Name, properties: EventProps<Name>) {
  if (!enabled()) return;
  const { properties: allowed, problems } = validateEvent(event, properties);
  warnProblems(event, problems);
  // Browser event names are exactly the click / view / client ones (BrowserEventName).
  send(event, EVENTS[event].type as 'click' | 'view' | 'client', allowed);
}

/** A pageview with the route pattern only ("/@[handle]/[slug]"), never the real path. */
export function trackPageview(pathname: string) {
  const template = routeTemplate(pathname);
  setScreen(screenFor(template));
  if (!enabled()) return;
  send('$pageview', 'view', { $current_url: `https://onquest.in${template}`, $pathname: template });
}
