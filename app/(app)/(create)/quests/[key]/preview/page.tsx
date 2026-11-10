import type { Metadata } from 'next';
import { getCreator } from '@/features/editor/getCreator';
import { PreviewQuest } from '@/features/editor/PreviewQuest';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Preview | ${SITE_NAME}`, robots: { index: false } };

export default async function PreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const [{ key }, creator] = await Promise.all([params, getCreator()]);
  return <PreviewQuest tripKey={key} creator={creator} />;
}
