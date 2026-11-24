import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getNewBlogContext } from '@/features/blog-editor/getNewBlogContext';
import { NewBlogView } from '@/features/blog-editor/NewBlogView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Write a blog | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<{ source?: string }> };

export default async function NewBlogPage({ searchParams }: Props) {
  const [context, { source }] = await Promise.all([getNewBlogContext(), searchParams]);
  // Without access, "Write a blog" is still "Releasing soon" (spec §3.9).
  if (!context) redirect('/create');
  return <NewBlogView {...context} source={source === 'write_your_own' ? 'write_your_own' : 'create'} />;
}
