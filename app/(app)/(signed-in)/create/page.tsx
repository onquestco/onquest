import type { Metadata } from 'next';
import { hasBlogAccess } from '@/features/blog-editor/hasBlogAccess';
import { getHasPublishedQuest } from '@/features/editor/firstQuest';
import { CreateChooser } from '@/features/shell/CreateChooser';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Create | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<{ source?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  const [blogsEnabled, hasPublishedQuest, { source }] = await Promise.all([
    hasBlogAccess(),
    getHasPublishedQuest(),
    searchParams,
  ]);
  return (
    <CreateChooser
      blogsEnabled={blogsEnabled}
      hasPublishedQuest={hasPublishedQuest}
      source={source === 'write_your_own' ? 'write_your_own' : 'create'}
    />
  );
}
