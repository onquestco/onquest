import { z } from 'zod';

// Where sign-in sends people back to (spec A §3.8). `next` comes from the URL, so it's checked:
// only a path on this site, never another origin.

export const DEFAULT_NEXT = '/home';
const BASE = 'https://onquest.invalid';

export const SignInIntentSchema = z.enum(['like', 'comment', 'make_your_own']);
export type SignInIntent = z.infer<typeof SignInIntentSchema>;

/**
 * What opened sign-in, for sign_in_click, user_signed_up and user_signed_in (analytics v2, codes.csv
 * "sign_in source"). Rides through sign-in in the URL like `intent`. Optional: links that don't set
 * it are worked out from intent and next by signInSource().
 */
export const SignInSourceSchema = z.enum(['button', 'make_your_own_quest', 'make_your_own_blog', 'other']);
export type SignInSource = z.infer<typeof SignInSourceSchema>;

export type SignInReturn = { next: string; intent?: SignInIntent; ref?: string; source?: SignInSource };

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

/** Reads next, intent, ref and source from a request's query, dropping anything unsafe or unknown. */
export function readSignInReturn(params: URLSearchParams | Record<string, string | undefined>): SignInReturn {
  const get = (name: string) =>
    params instanceof URLSearchParams ? (params.get(name) ?? undefined) : params[name];
  const intent = SignInIntentSchema.safeParse(get('intent'));
  const ref = z.uuid().safeParse(get('ref'));
  const source = SignInSourceSchema.safeParse(get('source'));
  const signInReturn: SignInReturn = {
    next: safeNext(get('next')),
    intent: intent.success ? intent.data : undefined,
    ref: ref.success ? ref.data : undefined,
  };
  if (source.success) signInReturn.source = source.data;
  return signInReturn;
}

/** `path?next=…&intent=…&ref=…&source=…`, for carrying the return through sign-in and onboarding. */
export function withSignInReturn(path: string, { next, intent, ref, source }: SignInReturn): string {
  const query = new URLSearchParams({ next });
  if (intent) query.set('intent', intent);
  if (ref) query.set('ref', ref);
  if (source) query.set('source', source);
  return `${path}?${query.toString()}`;
}

/**
 * What opened sign-in. The popup sets it for the links it catches; otherwise: Make your own (or
 * any link into Pick photos) is the Quest one, a blog composer link the blog one, a like or
 * comment "other", and anything else (the top-right Sign in button, /login itself) the button.
 */
export function signInSource({ source, intent, next }: SignInReturn): SignInSource {
  if (source) return source;
  if (intent === 'make_your_own' || next.startsWith('/quests/new')) return 'make_your_own_quest';
  if (next.startsWith('/blogs/new')) return 'make_your_own_blog';
  if (intent === 'like' || intent === 'comment') return 'other';
  return 'button';
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
