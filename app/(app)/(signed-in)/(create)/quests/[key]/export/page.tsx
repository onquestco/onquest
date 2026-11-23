import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExportScreen } from '@/features/export/ExportScreen';
import { getExportQuest } from '@/features/export/getExportQuest';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Download for Instagram | ${SITE_NAME}`,
  robots: { index: false },
};

// The owner's published Quests only.
export default async function ExportPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const quest = await getExportQuest(key);
  if (!quest) notFound();
  return <ExportScreen tripKey={key} trip={quest.trip} templateId={quest.templateId} />;
}
