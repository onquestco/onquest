import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { getYourQuests } from '@/features/quests/getYourQuests';
import { YourQuestsView } from '@/features/quests/YourQuestsView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Your Quests | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<{ manage?: string }> };

export default async function YourQuestsPage({ searchParams }: Props) {
  if (!(await getCurrentUser())) redirect('/login?next=/quests');
  const { manage } = await searchParams;
  return <YourQuestsView initial={await getYourQuests()} manage={manage} />;
}
