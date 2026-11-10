import type { Metadata } from 'next';
import { YourQuestsView } from '@/features/home/YourQuestsView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Your Quests | ${SITE_NAME}`, robots: { index: false } };

export default function YourQuestsPage() {
  return <YourQuestsView />;
}
