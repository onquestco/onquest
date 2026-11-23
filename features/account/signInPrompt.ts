'use client';

import { useSyncExternalStore } from 'react';
import { readSignInReturn, safeNext, type SignInIntent, type SignInReturn } from '@/lib/auth/next';

// The sign-in popup (OQ-16): anyone can look around OnQuest signed out, and the popup opens when
// they try to do something (like, comment, follow, create). One popup for the whole app, opened
// from anywhere through askToSignIn().

let asking: SignInReturn | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Opens the popup. `next` is where sign-in comes back to: this page unless given. */
export function askToSignIn({
  intent,
  next,
  ref,
}: { intent?: SignInIntent; next?: string; ref?: string } = {}) {
  asking = {
    next: safeNext(next ?? `${window.location.pathname}${window.location.search}`),
    intent,
    ref,
  };
  emit();
}

export function closeSignIn() {
  asking = null;
  emit();
}

export function useSignInPrompt(): SignInReturn | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => asking,
    () => null,
  );
}

/** A link to /login?next=…&intent=…, as the signed-out buttons render: what the popup should do. */
export function signInReturnFromHref(href: string): SignInReturn {
  return readSignInReturn(new URL(href, window.location.origin).searchParams);
}

// Pages that need an account. Signed out, a link to one of these opens the popup instead.
const NEEDS_ACCOUNT = [
  /^\/quests(\/|$)/,
  /^\/create$/,
  /^\/notifications$/,
  /^\/settings(\/|$)/,
  /^\/@[^/]+\/follow(ers|ing)$/,
];

export function needsAccount(pathname: string): boolean {
  return NEEDS_ACCOUNT.some((pattern) => pattern.test(pathname));
}

/**
 * Signed in, as far as the browser can tell: Supabase keeps the session in a readable cookie.
 * Only used to decide whether to show the popup; the server still checks every request.
 */
export function looksSignedIn(): boolean {
  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith('sb-') && /-auth-token(\.0)?=/.test(cookie));
}
