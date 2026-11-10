import { createHmac, timingSafeEqual } from 'node:crypto';
import { absoluteUrl } from '../site';

// One-tap "stop these emails" links (spec B §3.5, S2). The token can only turn one switch off for
// one person, and is signed so nobody can make links for someone else. EMAIL_LINK_SECRET holds
// "v1:…" (later "v1:…,v2:…"): the newest signs, every listed one still verifies.

export type EmailKind = 'like' | 'comment' | 'follow';
export const EMAIL_KINDS: EmailKind[] = ['like', 'comment', 'follow'];

function secrets(raw: string | undefined): Map<string, string> {
  return new Map(
    (raw ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .flatMap((part) => {
        const [version, ...rest] = part.split(':');
        const secret = rest.join(':');
        return version && secret ? [[version, secret] as const] : [];
      }),
  );
}

const sign = (secret: string, userKey: string, kind: EmailKind) =>
  createHmac('sha256', secret).update(`${userKey}:${kind}`).digest('hex');

export function unsubscribeUrl(
  userKey: string,
  kind: EmailKind,
  rawSecrets = process.env.EMAIL_LINK_SECRET,
): string {
  const all = [...secrets(rawSecrets)];
  const latest = all.at(-1);
  if (!latest) throw new Error('Missing environment variable EMAIL_LINK_SECRET');
  const [version, secret] = latest;
  const query = new URLSearchParams({ u: userKey, k: kind, v: version, t: sign(secret, userKey, kind) });
  return absoluteUrl(`/email/unsubscribe?${query.toString()}`);
}

/** The switch to turn off, or null if the link wasn't made by us. Compared in constant time. */
export function verifyUnsubscribe(
  params: URLSearchParams,
  rawSecrets = process.env.EMAIL_LINK_SECRET,
): { userKey: string; kind: EmailKind } | null {
  const userKey = params.get('u') ?? '';
  const kind = params.get('k') as EmailKind;
  const secret = secrets(rawSecrets).get(params.get('v') ?? '');
  const token = params.get('t') ?? '';
  if (
    !secret ||
    !EMAIL_KINDS.includes(kind) ||
    !/^[0-9a-f-]{36}$/.test(userKey) ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    return null;
  }
  const expected = Buffer.from(sign(secret, userKey, kind), 'hex');
  const given = Buffer.from(token, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given) ? { userKey, kind } : null;
}
