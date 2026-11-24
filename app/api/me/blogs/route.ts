import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { getMyBlogs } from '@/features/blogs/getMyBlogs';

// The own profile's Blogs list: drafts, unlisted and private blogs too (blogs spec §6.3). Per
// person: never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: 'signed_out' }, { status: 401, headers: NO_STORE });
  return NextResponse.json(await getMyBlogs(), { headers: NO_STORE });
}
