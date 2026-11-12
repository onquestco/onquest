import 'server-only';
import { SERVER_EVENTS, type ServerEventName } from './taxonomy';
import { keepAllowed, propertyProblems, type EventProperties } from './validate';

// Server events (spec A §3.9): the source of truth for anything the database also counts. Sent
// straight to PostHog, inside after() by callers, so they never slow or fail an action. Nothing
// is sent until NEXT_PUBLIC_POSTHOG_KEY is set. Distinct id = the user key.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST ?? 'us.i.posthog.com';
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';

type Context = {
  /** x-vercel-ip-country of the request, if there was one. Never the IP. */
  country?: string | null;
  screen?: string;
};

export async function trackServer(
  event: ServerEventName,
  userKey: string,
  properties: EventProperties = {},
  context: Context = {},
): Promise<void> {
  if (!KEY) return;
  const rules = SERVER_EVENTS[event];
  const problems = propertyProblems(rules, properties);
  if (problems.length > 0) {
    console.warn(`Analytics: ${event} dropped`, problems);
    return;
  }
  try {
    await fetch(`https://${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: userKey,
        timestamp: new Date().toISOString(),
        properties: {
          ...keepAllowed(rules, properties),
          event_id: crypto.randomUUID(),
          type: 'server',
          server_ts: new Date().toISOString(),
          app_version: APP_VERSION,
          screen: context.screen ?? 'server',
          country: context.country ?? undefined,
          // Country comes from Vercel's header; PostHog mustn't look up our server's IP.
          $geoip_disable: true,
          $lib: 'onquest-server',
        },
      }),
    });
  } catch {
    // Analytics never fails an action.
  }
}
