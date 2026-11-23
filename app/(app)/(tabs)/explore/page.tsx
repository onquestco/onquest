import type { Metadata } from 'next';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { ExploreView } from '@/features/explore/ExploreView';
import { getExplore } from '@/features/explore/getExplore';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Explore | ${SITE_NAME}`, robots: { index: false } };

// Open to everyone (OQ-16); Follow signed out opens the sign-in popup.
export default async function ExplorePage() {
  const [explore, user] = await Promise.all([getExplore(), getCurrentUser()]);
  return <ExploreView {...explore} signedIn={Boolean(user)} />;
}
