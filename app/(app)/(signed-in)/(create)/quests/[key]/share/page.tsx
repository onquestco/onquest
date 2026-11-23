import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditorDraft } from '@/features/editor/EditorDraft';
import { getQuestDraft } from '@/features/editor/getQuestDraft';
import { ShareScreen } from '@/features/editor/ShareScreen';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = { title: `Your Quest is live | ${SITE_NAME}`, robots: { index: false } };

export default async function SharePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const draft = await getQuestDraft(key);
  if (!draft) notFound();
  return (
    <EditorDraft initial={draft}>
      <ShareScreen tripKey={key} siteUrl={SITE_URL} />
    </EditorDraft>
  );
}
