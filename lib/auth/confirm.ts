import { afterSignIn, readSignInReturn } from './next';

// Email sign-in links land on /auth/confirm (spec A §3.8). They carry a token hash, not a PKCE
// code, so they work in whichever browser opens them: a link asked for inside Instagram opens in
// Safari or Chrome from the mail app, and verifyOtp signs in there.

export const LINK_EXPIRED = '/login?error=link';

type Deps = {
  verifyOtp: (tokenHash: string) => Promise<{ ok: boolean }>;
  hasProfile: () => Promise<boolean>;
};

/** The path to redirect to after an email link. */
export async function confirmEmailLink(params: URLSearchParams, deps: Deps): Promise<string> {
  const tokenHash = params.get('token_hash');
  if (!tokenHash || params.get('type') !== 'email') return LINK_EXPIRED;
  const { ok } = await deps.verifyOtp(tokenHash);
  if (!ok) return LINK_EXPIRED;
  return afterSignIn(readSignInReturn(params), await deps.hasProfile());
}
