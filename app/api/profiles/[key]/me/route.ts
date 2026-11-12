import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';

// What the cached profile page can't know: signed in, is this me, do I follow them. Never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const SIGNED_OUT = { signedIn: false, isSelf: false, following: false };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const key = z.uuid().safeParse((await params).key);
  if (!key.success) return NextResponse.json(SIGNED_OUT, { status: 400, headers: NO_STORE });

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(SIGNED_OUT, { headers: NO_STORE });
  if (user.id === key.data)
    return NextResponse.json({ signedIn: true, isSelf: true, following: false }, { headers: NO_STORE });

  const { data } = await supabase.rpc('get_my_follow_state', { p_keys: [key.data] });
  const following = Array.isArray(data) && data.includes(key.data);
  return NextResponse.json({ signedIn: true, isSelf: false, following }, { headers: NO_STORE });
}
