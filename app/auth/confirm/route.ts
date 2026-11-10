import { NextResponse, type NextRequest } from 'next/server';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { confirmEmailLink } from '@/lib/auth/confirm';
import { absoluteUrl } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

// Email sign-in links land here (token hash, not PKCE), so they work in any browser.
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const to = await confirmEmailLink(request.nextUrl.searchParams, {
    verifyOtp: async (tokenHash) => {
      const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
      return { ok: !error };
    },
    hasProfile: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return Boolean(user && (await getMyProfile(user.id)));
    },
  });
  return NextResponse.redirect(absoluteUrl(to));
}
