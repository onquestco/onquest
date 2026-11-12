import type { Metadata } from 'next';
import { ExploreView } from '@/features/explore/ExploreView';
import { getExplore } from '@/features/explore/getExplore';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Explore | ${SITE_NAME}`, robots: { index: false } };

export default async function ExplorePage() {
  const explore = await getExplore();
  return <ExploreView {...explore} />;
}
