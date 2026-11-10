import type { Metadata } from 'next';
import { getCreator } from '@/features/editor/getCreator';
import { HomeView } from '@/features/home/HomeView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Home | ${SITE_NAME}`, robots: { index: false } };

export default async function HomePage() {
  const creator = await getCreator();
  return <HomeView name={creator.name} />;
}
