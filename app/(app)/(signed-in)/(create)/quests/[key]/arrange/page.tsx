import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Arranging } from '@/features/editor/Arranging';
import { getQuestDraft } from '@/features/editor/getQuestDraft';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Arranging | ${SITE_NAME}`, robots: { index: false } };

export default async function ArrangePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const draft = await getQuestDraft(key);
  if (!draft) notFound();
  return <Arranging tripKey={key} arrangedBefore={draft.document.photos.length > 0} />;
}
