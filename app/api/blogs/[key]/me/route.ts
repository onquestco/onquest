import { NextResponse, type NextRequest } from 'next/server';
import { toViewer } from '@/features/blogs/blogViewer';
import type { BlogViewer } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';

// What the cached blog page can't know: is this person signed in, did they like it, is it theirs,
// and for the writer the ⋯ menu's token and the linked-Quest note (blogs spec §4.2). Per person:
// never cached anywhere.
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const SIGNED_OUT: BlogViewer = {
  signedIn: false,
  liked: false,
  isOwner: false,
  followingOwner: false,
  linkedQuestHidden: false,
};

// ?owner=<profile key> adds whether I follow the writer (Follow next to their name).
export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewer = await toViewer(supabase, user, (await params).key, request.nextUrl.searchParams.get('owner'));
  if (viewer === 'invalid') return NextResponse.json(SIGNED_OUT, { status: 400, headers: NO_STORE });
  return NextResponse.json(viewer ?? SIGNED_OUT, { headers: NO_STORE });
}
