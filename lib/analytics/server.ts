import 'server-only';
import { cookies, headers } from 'next/headers';
import {
  analyticsEnv,
  appVersion,
  CONTEXT_COOKIE,
  contextCookieEnabled,
  parseContextCookie,
  requestFacts,
  type DeviceContext,
} from './common';
import type { EventProps, ServerEventName } from './taxonomy';
import { buildUserInfo, sessionUser, type SessionUser } from './userInfo';
import { validateEvent, warnProblems } from './validate';

// Server events (docs/specs/analytics-v2.md §3.2, §4.2): the source of truth for anything the
// database also counts. Sent straight to PostHog, inside after() by callers, so they never slow
// or fail an action. Nothing is sent until NEXT_PUBLIC_POSTHOG_KEY is set.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST ?? 'us.i.posthog.com';

/** Events about someone other than the request's own person: no device ids, no user_info. */
const NOT_ABOUT_THE_REQUESTER = new Set<string>(['notification_sent', 'account_deleted']);

type HeaderReader = { get(name: string): string | null };

export type ServerRequest = {
  headers: HeaderReader;
  session: SessionUser | null;
  /** oq_actx, already parsed; null when the cookie is off, missing or malformed. */
  device: DeviceContext | null;
};

/**
 * The PostHog payload for one server event. Pure, so server.test.ts can check every shape.
 * Device context and user_info come only when the verified session is the event's own user:
 * never for notification_sent (the recipient), account_deleted, or the unsubscribe link (no session).
 */
export function serverPayload(
  event: ServerEventName,
  userKey: string | null,
  properties: object,
  request: ServerRequest,
  options: { now: Date; createId: () => string; env: Record<string, string | undefined> },
) {
  const { properties: allowed, problems } = validateEvent(event, properties);
  warnProblems(event, problems);
  const facts = requestFacts(request.headers);
  const ownRequest =
    !NOT_ABOUT_THE_REQUESTER.has(event) && userKey !== null && request.session?.userKey === userKey;
  const device = ownRequest ? request.device : null;
  const distinctId =
    event === 'account_deleted'
      ? `deleted_${options.createId()}` // never recreates or joins the deleted person (§5.2)
      : (userKey ?? `server_${options.createId()}`);
  return {
    api_key: KEY,
    event,
    distinct_id: distinctId,
    timestamp: options.now.toISOString(),
    properties: {
      ...allowed,
      event_id: options.createId(),
      type: 'server',
      user_id: userKey,
      anon_id: device?.anonId ?? null,
      session_id: device?.sessionId ?? null,
      screen: device?.screen ?? null,
      platform: device?.platform ?? facts.platform,
      os: facts.os,
      browser: facts.browser,
      app_version: appVersion(options.env.VERCEL_GIT_COMMIT_SHA),
      env: analyticsEnv(options.env.VERCEL_ENV),
      country: facts.country,
      is_bot_flg: facts.is_bot_flg,
      user_info: ownRequest ? buildUserInfo(request.session, userKey, request.headers, options.env) : null,
      // Country comes from Vercel's header; PostHog mustn't look up our server's IP.
      $geoip_disable: true,
    },
  };
}

const NO_HEADERS: HeaderReader = { get: () => null };

/** This request's headers, session and analytics cookie, or nothing outside a request (cron). */
async function currentRequest(): Promise<ServerRequest> {
  try {
    const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
    const device = contextCookieEnabled(process.env.NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE)
      ? parseContextCookie(cookieStore.get(CONTEXT_COOKIE)?.value)
      : null;
    return { headers: requestHeaders, session: await sessionUser(cookieStore.getAll()), device };
  } catch {
    return { headers: NO_HEADERS, session: null, device: null };
  }
}

/**
 * One server event from the v2 taxonomy. `userKey` is the event's user_id: the session user,
 * except notification_sent (the recipient), account_deleted and setting_changed from the
 * unsubscribe link. Never dropped for a property: unknown ones and bad values are removed.
 */
export async function trackServer<Name extends ServerEventName>(
  event: Name,
  userKey: string | null,
  properties: EventProps<Name>,
): Promise<void> {
  if (!KEY) return;
  try {
    const payload = serverPayload(event, userKey, properties, await currentRequest(), {
      now: new Date(),
      createId: () => crypto.randomUUID(),
      env: process.env,
    });
    await fetch(`https://${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics never fails an action.
  }
}
