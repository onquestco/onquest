import type { Metadata } from 'next';
import { BlogShareScreen } from '@/features/blog-editor/BlogShareScreen';
import { getBlogShare } from '@/features/blog-editor/getBlogShare';
import { LostBlog } from '@/features/blog-editor/LostBlog';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Your blog is live | ${SITE_NAME}`, robots: { index: false } };

type Props = { params: Promise<{ key: string }>; searchParams: Promise<{ updated?: string }> };

export default async function BlogSharePage({ params, searchParams }: Props) {
  const [{ key }, { updated }] = await Promise.all([params, searchParams]);
  const share = await getBlogShare(key);
  if (!share) return <LostBlog />;
  return <BlogShareScreen {...share} updated={updated === '1'} />;
}
