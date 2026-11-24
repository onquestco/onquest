import { NextResponse, type NextRequest } from 'next/server';
import { getOwnPrivateBlogKey } from '@/features/blogs/getOwnPrivateBlogKey';

// Asked by "This blog is private." pages, which are cached and can't know who is looking.
// Answers with the blog's key only to its writer, so they get "Open your blog" (blogs spec §4.2).
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle') ?? '';
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  const ownerBlogKey = await getOwnPrivateBlogKey(handle, slug);
  return NextResponse.json({ ownerBlogKey }, { headers: NO_STORE });
}
