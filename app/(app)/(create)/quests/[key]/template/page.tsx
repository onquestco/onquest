import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChooseTemplate } from '@/features/editor/ChooseTemplate';
import { EditorDraft } from '@/features/editor/EditorDraft';
import { getQuestDraft } from '@/features/editor/getQuestDraft';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Choose a template | ${SITE_NAME}`, robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const draft = await getQuestDraft(key);
  if (!draft) notFound();
  return (
    <EditorDraft initial={draft}>
      <ChooseTemplate tripKey={key} />
    </EditorDraft>
  );
}
