import type { Metadata } from 'next';
import { NewQuestView } from '@/features/editor/NewQuestView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Create a Quest | ${SITE_NAME}`, robots: { index: false } };

export default function NewQuestPage() {
  return <NewQuestView />;
}
