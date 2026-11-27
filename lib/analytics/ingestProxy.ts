// /ingest forwards analytics to PostHog (spec A §3.9, analytics v2 §3.2). A route handler, not a
// rewrite, so the browser's Referer (the full page URL, maybe an unlisted link), cookies, auth and
// IP address never leave. The body is checked and rebuilt by ingestEnrich.ts first.

const FORWARDED_HEADERS = ['user-agent'];
const DROPPED_RESPONSE_HEADERS = ['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding'];

/** The headers PostHog gets: JSON and the user agent. Never x-forwarded-for, cookies or Referer. */
export function upstreamHeaders(incoming: Headers): Headers {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/** PostHog's answer without cookies (it sets none we want on our domain). */
export function downstreamHeaders(upstream: Headers): Headers {
  const headers = new Headers(upstream);
  for (const name of DROPPED_RESPONSE_HEADERS) headers.delete(name);
  return headers;
}

/**
 * The same paths as before (only PostHog's capture paths; nothing else on its host is reachable).
 * decide/flags have no event body, so they get 204 and are never forwarded.
 */
export function isCapturePath(path: string[]): boolean {
  return /^(i\/v0\/e|e|batch|capture|decide|flags)\/?$/.test(path.join('/'));
}

/** Every accepted body is re-sent as one batch (it may gain an $identify). */
export function batchUrl(host: string): string {
  return `https://${host}/batch/`;
}

/** The body, or null once it passes `limit` bytes (reading stops there; content-length checked first). */
export async function readBodyUpTo(request: Request, limit: number): Promise<Uint8Array | null> {
  if (Number(request.headers.get('content-length') ?? 0) > limit || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
