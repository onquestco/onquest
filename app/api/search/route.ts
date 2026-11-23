import { NextResponse, type NextRequest } from 'next/server';
import { searchPublic } from '@/features/explore/searchPublic';

// Explore's search box, after a 500 ms typing pause. Open to everyone like Explore (OQ-16): it only
// finds public Quests and people. Never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const results = await searchPublic(request.nextUrl.searchParams.get('q') ?? '');
  return NextResponse.json(results, { headers: NO_STORE });
}
