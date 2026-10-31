import { NextResponse, type NextRequest } from 'next/server';
import { absoluteUrl } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

// Google and magic links both land here. Onboarding sends people with a profile on to the home page.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const failed = NextResponse.redirect(absoluteUrl('/login?error=1'));
  if (!code) return failed;

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? failed : NextResponse.redirect(absoluteUrl('/onboarding'));
}
