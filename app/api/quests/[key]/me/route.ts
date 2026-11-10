import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { ViewerState } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';

// What the cached Quest page can't know: is this person signed in, did they like it, is it theirs.
// Never cached anywhere: it's per person.
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const SIGNED_OUT: ViewerState = { signedIn: false, liked: false, isOwner: false, followingOwner: false };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const key = z.uuid().safeParse((await params).key);
  if (!key.success) return NextResponse.json(SIGNED_OUT, { status: 400, headers: NO_STORE });

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(SIGNED_OUT, { headers: NO_STORE });

  const { data, error } = await supabase.rpc('get_my_quest_state', { p_trip_key: key.data });
  const state = z.object({ liked: z.boolean(), is_owner: z.boolean() }).safeParse(data);
  if (error || !state.success)
    return NextResponse.json({ ...SIGNED_OUT, signedIn: true }, { headers: NO_STORE });
  const viewer: ViewerState = {
    signedIn: true,
    liked: state.data.liked,
    isOwner: state.data.is_owner,
    followingOwner: false,
  };
  return NextResponse.json(viewer, { headers: NO_STORE });
}
