// /ingest forwards analytics to PostHog (spec A §3.9). A route handler, not a rewrite, so the
// browser's Referer (the full page URL, maybe an unlisted link), cookies and auth never leave.

const FORWARDED_HEADERS = ['content-type', 'content-encoding', 'user-agent'];
const DROPPED_RESPONSE_HEADERS = ['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding'];

/** The headers PostHog gets: the body's type, the user agent and the client IP (for country). */
export function upstreamHeaders(incoming: Headers): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  const ip = incoming.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (ip) headers.set('x-forwarded-for', ip);
  return headers;
}

/** PostHog's answer without cookies (it sets none we want on our domain). */
export function downstreamHeaders(upstream: Headers): Headers {
  const headers = new Headers(upstream);
  for (const name of DROPPED_RESPONSE_HEADERS) headers.delete(name);
  return headers;
}

/** Only PostHog's capture paths: nothing else on its host is reachable through us. */
export function upstreamUrl(host: string, path: string[], search: string): string | null {
  const joined = path.join('/');
  if (!/^(i\/v0\/e|e|batch|capture|decide|flags)\/?$/.test(joined)) return null;
  return `https://${host}/${joined}${joined.endsWith('/') ? '' : '/'}${search}`;
}
