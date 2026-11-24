import type { Metadata } from 'next';
import { BlogComposer } from '@/features/blog-editor/BlogComposer';
import { getBlogComposer } from '@/features/blog-editor/getBlogComposer';
import { LostBlog } from '@/features/blog-editor/LostBlog';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Edit blog | ${SITE_NAME}`, robots: { index: false } };

export default async function EditBlogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const composer = await getBlogComposer(key);
  if (!composer) return <LostBlog />;
  return <BlogComposer {...composer} />;
}
