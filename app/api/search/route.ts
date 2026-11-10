import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { searchPublic } from '@/features/explore/searchPublic';

// Explore's search box, after a 500 ms typing pause. Signed in only; never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: 'signed_out' }, { status: 401, headers: NO_STORE });
  const results = await searchPublic(request.nextUrl.searchParams.get('q') ?? '');
  return NextResponse.json(results, { headers: NO_STORE });
}
