import { NextResponse, type NextRequest } from 'next/server';
import { finishDeletionOnSignIn } from '@/features/account/finishDeletionOnSignIn';
import { getMyProfile } from '@/features/account/getCurrentUser';
import { afterSignIn, readSignInReturn } from '@/lib/auth/next';
import { absoluteUrl } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

// Google sign-in lands here. PKCE works because Google sign-in starts and ends in the same browser;
// email links use /auth/confirm instead.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const failed = NextResponse.redirect(absoluteUrl('/login?error=1'));
  if (!code) return failed;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failed;
  const deleted = await finishDeletionOnSignIn(supabase);
  if (deleted) return NextResponse.redirect(absoluteUrl(deleted));

  const hasProfile = Boolean(await getMyProfile(data.user.id));
  return NextResponse.redirect(
    absoluteUrl(afterSignIn(readSignInReturn(request.nextUrl.searchParams), hasProfile)),
  );
}
