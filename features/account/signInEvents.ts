import 'server-only';
import { after } from 'next/server';
import { trackServer } from '@/lib/analytics/server';
import type { SignInReturn } from '@/lib/auth/next';
import { signedInProperties, signedUpProperties, type SignInMethod } from './signInProperties';

export type SignInOutcome = {
  method: SignInMethod;
  userKey: string;
  /** Had a profile before this sign-in: a returning person. None yet means a new account. */
  hasProfile: boolean;
  signInReturn: SignInReturn;
};

/**
 * user_signed_in or user_signed_up, after the auth route's response (analytics v2 §10: only once
 * the sign-in has succeeded). Never for someone whose account deletion was finished instead.
 */
export function sendSignInEvent({ method, userKey, hasProfile, signInReturn }: SignInOutcome): void {
  after(() =>
    hasProfile
      ? trackServer('user_signed_in', userKey, signedInProperties(method, signInReturn))
      : trackServer('user_signed_up', userKey, signedUpProperties(method, signInReturn)),
  );
}
