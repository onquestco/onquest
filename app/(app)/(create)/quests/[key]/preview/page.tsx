import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditorDraft } from '@/features/editor/EditorDraft';
import { getCreator } from '@/features/editor/getCreator';
import { getQuestDraft } from '@/features/editor/getQuestDraft';
import { PreviewQuest } from '@/features/editor/PreviewQuest';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Preview | ${SITE_NAME}`, robots: { index: false } };

export default async function PreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [draft, creator] = await Promise.all([getQuestDraft(key), getCreator()]);
  if (!draft) notFound();
  return (
    <EditorDraft initial={draft}>
      <PreviewQuest tripKey={key} creator={creator} />
    </EditorDraft>
  );
}
