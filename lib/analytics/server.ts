import 'server-only';
import type { EventProps, ServerEventName } from './taxonomy';
import { validateEvent, warnProblems } from './validate';

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

/**
 * One server event from the v2 taxonomy (docs/specs/analytics-v2.md §4.2). Never dropped for a
 * property: unknown ones and bad values are removed, and problems are warned in dev by name only.
 */
export async function trackServer<Name extends ServerEventName>(
  event: Name,
  userKey: string,
  properties: EventProps<Name>,
  context: Context = {},
): Promise<void> {
  if (!KEY) return;
  const { properties: allowed, problems } = validateEvent(event, properties);
  warnProblems(event, problems);
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
          ...allowed,
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
