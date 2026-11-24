import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LostBlog } from '@/features/blog-editor/LostBlog';
import { BlogView } from '@/features/blogs/BlogView';
import { getOwnBlogPage } from '@/features/blogs/getOwnBlogPage';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Your blog | ${SITE_NAME}`, robots: { index: false, follow: false } };

type Props = { params: Promise<{ key: string }>; searchParams: Promise<{ updated?: string }> };

export default async function OwnBlogPage({ params, searchParams }: Props) {
  const [{ key }, { updated }] = await Promise.all([params, searchParams]);
  const page = await getOwnBlogPage(key);
  if (page.kind === 'lost') return <LostBlog />;
  if (page.kind === 'draft') redirect(`/blogs/${page.key}/edit`);
  return (
    <BlogView
      blog={page.blog}
      social={page.social}
      ownerKey={page.ownerKey}
      linkedQuest={page.linkedQuest}
      mode="owner"
      updated={updated === '1'}
    />
  );
}
