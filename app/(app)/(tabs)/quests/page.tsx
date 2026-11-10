import type { Metadata } from 'next';
import { getYourQuests } from '@/features/quests/getYourQuests';
import { YourQuestsView } from '@/features/quests/YourQuestsView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Your Quests | ${SITE_NAME}`, robots: { index: false } };

export default async function YourQuestsPage() {
  return <YourQuestsView initial={await getYourQuests()} />;
}
