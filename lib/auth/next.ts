import { z } from 'zod';

// Where sign-in sends people back to (spec A §3.8). `next` comes from the URL, so it's checked:
// only a path on this site, never another origin.

export const DEFAULT_NEXT = '/home';
const BASE = 'https://onquest.invalid';

export const SignInIntentSchema = z.enum(['like', 'comment', 'make_your_own']);
export type SignInIntent = z.infer<typeof SignInIntentSchema>;

export type SignInReturn = { next: string; intent?: SignInIntent; ref?: string };

/** A same-site path ("/@riya/goa-trip?x=1"), or /home for anything else. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_NEXT;
  // Control characters and backslashes can turn a path into another origin in some browsers.
  if (/[\u0000-\u001f\\]/.test(raw)) return DEFAULT_NEXT;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

/** Reads next, intent and ref from a request's query, dropping anything unsafe or unknown. */
export function readSignInReturn(params: URLSearchParams | Record<string, string | undefined>): SignInReturn {
  const get = (name: string) =>
    params instanceof URLSearchParams ? (params.get(name) ?? undefined) : params[name];
  const intent = SignInIntentSchema.safeParse(get('intent'));
  const ref = z.uuid().safeParse(get('ref'));
  return {
    next: safeNext(get('next')),
    intent: intent.success ? intent.data : undefined,
    ref: ref.success ? ref.data : undefined,
  };
}

/** `path?next=…&intent=…&ref=…`, for carrying the return through sign-in and onboarding. */
export function withSignInReturn(path: string, { next, intent, ref }: SignInReturn): string {
  const query = new URLSearchParams({ next });
  if (intent) query.set('intent', intent);
  if (ref) query.set('ref', ref);
  return `${path}?${query.toString()}`;
}

/**
 * Where to go once signed in: pick a username first if there's no profile, else back to `next`,
 * with the intent attached so the Quest page can finish what was tapped (like, open the comment box).
 */
export function afterSignIn(signInReturn: SignInReturn, hasProfile: boolean): string {
  if (!hasProfile) return withSignInReturn('/onboarding', signInReturn);
  const { next, intent } = signInReturn;
  if (!intent) return next;
  const url = new URL(next, BASE);
  url.searchParams.set('intent', intent);
  return `${url.pathname}${url.search}${url.hash}`;
}
