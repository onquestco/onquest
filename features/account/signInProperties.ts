import { CONTENT_TYPE_CODE, SIGN_IN_SOURCE_CODE } from '@/lib/analytics/codes';
import type { EventProps } from '@/lib/analytics/taxonomy';
import { signInSource, type SignInReturn } from '@/lib/auth/next';

// Properties of the sign-in events (analytics v2, docs/analytics/v2/events.csv section 1):
// sign_in_click from the browser, user_signed_up and user_signed_in from the auth routes. Codes
// and keys only, never the email.

export type SignInMethod = 'google' | 'email_link';

const BLOG_PATH = /^\/@[^/]+\/blog\/[^/?#]+/;

/** sign_in_click: "Continue with Google" or "Email me a sign-in link" tapped. */
export function signInClickProperties(
  method: SignInMethod,
  signInReturn: SignInReturn,
  now: Date,
): EventProps<'sign_in_click'> {
  return { method, source: SIGN_IN_SOURCE_CODE[signInSource(signInReturn)], client_ts: now.toISOString() };
}

/** user_signed_in: a returning person (they have a profile) signed in. */
export function signedInProperties(method: SignInMethod, signInReturn: SignInReturn): EventProps<'user_signed_in'> {
  // days_since_last_sign_in is derived in BigQuery (spec D7).
  return { method, source: SIGN_IN_SOURCE_CODE[signInSource(signInReturn)] };
}

/**
 * user_signed_up: the first sign-in (no profile yet). `ref` is the key of the Quest or blog the
 * person was on when they tapped (Like, Comment, Make your own): a blog when sign-in returns to a
 * blog page, else a Quest. The creator's key isn't known here, so referrer_owner_user_id is left
 * out (optional); first_seen_ts is derived in BigQuery (D7).
 */
export function signedUpProperties(method: SignInMethod, signInReturn: SignInReturn): EventProps<'user_signed_up'> {
  const properties: EventProps<'user_signed_up'> = {
    method,
    source: SIGN_IN_SOURCE_CODE[signInSource(signInReturn)],
  };
  const { ref, next } = signInReturn;
  if (!ref) return properties;
  if (BLOG_PATH.test(next)) {
    return { ...properties, referrer_blog_id: ref, referrer_content_type: CONTENT_TYPE_CODE.blog };
  }
  return { ...properties, referrer_quest_id: ref, referrer_content_type: CONTENT_TYPE_CODE.quest };
}
