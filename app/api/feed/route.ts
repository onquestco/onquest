import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { getFeedPage } from '@/features/home/getHome';

// "Load more" on the Home feed. Per person: never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const QuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(1000),
  now: z.iso.datetime({ offset: true }),
});

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: 'signed_out' }, { status: 401, headers: NO_STORE });
  const query = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: 'invalid' }, { status: 400, headers: NO_STORE });
  return NextResponse.json(await getFeedPage(query.data.now, query.data.offset), { headers: NO_STORE });
}
