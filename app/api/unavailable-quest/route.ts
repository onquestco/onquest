import { NextResponse, type NextRequest } from 'next/server';
import { getOwnPrivateQuestKey } from '@/features/trip-page/getOwnPrivateQuestKey';

// Asked by "This Quest is private." pages, which are cached and can't know who is looking.
// Answers with the Quest's key only to its owner, so they get "Open your Quest" (spec B §3.2).
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle') ?? '';
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  const ownerQuestKey = await getOwnPrivateQuestKey(handle, slug);
  return NextResponse.json({ ownerQuestKey }, { headers: NO_STORE });
}
