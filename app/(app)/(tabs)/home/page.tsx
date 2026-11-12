import type { Metadata } from 'next';
import { getCreator } from '@/features/editor/getCreator';
import { getHome } from '@/features/home/getHome';
import { HomeView } from '@/features/home/HomeView';
import { getYourQuests } from '@/features/quests/getYourQuests';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Home | ${SITE_NAME}`, robots: { index: false } };

export default async function HomePage() {
  const [creator, yourQuests, home] = await Promise.all([getCreator(), getYourQuests(), getHome()]);
  return <HomeView name={creator.name} yourQuests={yourQuests} feed={home.feed} suggested={home.suggested} />;
}
