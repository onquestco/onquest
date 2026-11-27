'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/design-system/components/Logo';
import { Sheet } from '@/design-system/components/Sheet';
import { signInSource, type SignInReturn, type SignInSource } from '@/lib/auth/next';
import { LoginForm } from './LoginForm';
import { signInTitle } from './signInCopy';
import {
  askToSignIn,
  closeSignIn,
  looksSignedIn,
  needsAccount,
  signInReturnFromHref,
  useSignInPrompt,
} from './signInPrompt';

/**
 * sign_in source for a link the popup caught: Make your own Quest or Blog, else "other" (Like,
 * Comment, Follow, a tab or the bell). Only askToSignIn() with nothing, the top-right Sign in
 * button, counts as the button.
 */
function caughtLinkSource(caught: Pick<SignInReturn, 'next' | 'intent'>): SignInSource {
  const derived = signInSource(caught);
  return derived === 'button' ? 'other' : derived;
}

/**
 * The sign-in popup (OQ-16), mounted once in the root layout. Opens three ways: askToSignIn(); a
 * tap on any link to /login (the signed-out Like, Comment, Follow and Make your own buttons); and,
 * signed out, a tap on a link to a page that needs an account (Create, Your Quests, the bell…).
 * Signing in comes back to the same page, and finishes the like or opens the comment box.
 */
export function SignInSheet() {
  const asking = useSignInPrompt();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login' || pathname === '/onboarding') return;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
        return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.origin !== window.location.origin) return;
      if (link.pathname === '/login') {
        event.preventDefault();
        const caught = signInReturnFromHref(link.href);
        askToSignIn({ ...caught, source: caught.source ?? caughtLinkSource(caught) });
      } else if (needsAccount(link.pathname) && !looksSignedIn()) {
        event.preventDefault();
        const next = `${link.pathname}${link.search}`;
        const intent = link.pathname.startsWith('/quests/new') ? 'make_your_own' : undefined;
        askToSignIn({ next, intent, source: caughtLinkSource({ next, intent }) });
      }
    }
    // Capture, so it runs before Next's own link handling.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  if (!asking) return null;
  // The sign-in page's title fits a first visit; a popup interrupting something says what it's for.
  const title =
    asking.intent || asking.next.startsWith('/quests/new')
      ? signInTitle(asking.intent, asking.next)
      : 'Sign in to continue';
  return (
    <Sheet open title={title} onClose={closeSignIn}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo height={36} />
        <p className="text-body text-ink-muted">
          Sign in to like, comment, follow and make your own Quests. It takes a few seconds.
        </p>
      </div>
      <LoginForm signInReturn={asking} />
    </Sheet>
  );
}
