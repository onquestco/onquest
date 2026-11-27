import { NextResponse, type NextRequest } from 'next/server';
import { finishDeletionOnSignIn } from '@/features/account/finishDeletionOnSignIn';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { sendSignInEvent, type SignInOutcome } from '@/features/account/signInEvents';
import { confirmEmailLink } from '@/lib/auth/confirm';
import { readSignInReturn } from '@/lib/auth/next';
import { absoluteUrl } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

// Email sign-in links land here (token hash, not PKCE), so they work in any browser.
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  // Filled once the link has signed someone in (hasProfile is only asked after verifyOtp succeeds).
  const signedIn: { outcome?: SignInOutcome } = {};
  const to = await confirmEmailLink(request.nextUrl.searchParams, {
    verifyOtp: async (tokenHash) => {
      const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
      return { ok: !error };
    },
    hasProfile: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const hasProfile = Boolean(user && (await getMyProfile(user.id)));
      if (user) {
        signedIn.outcome = {
          method: 'email_link',
          userKey: user.id,
          hasProfile,
          signInReturn: readSignInReturn(request.nextUrl.searchParams),
        };
      }
      return hasProfile;
    },
  });
  const deleted = await finishDeletionOnSignIn(supabase);
  if (!deleted && signedIn.outcome) sendSignInEvent(signedIn.outcome);
  return NextResponse.redirect(absoluteUrl(deleted ?? to));
}
