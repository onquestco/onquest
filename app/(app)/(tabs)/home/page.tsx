import type { Metadata } from 'next';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { getHome } from '@/features/home/getHome';
import { HomeView } from '@/features/home/HomeView';
import { getYourQuests } from '@/features/quests/getYourQuests';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Home | ${SITE_NAME}`, robots: { index: false } };

// Open to everyone (OQ-16). Signed out: no greeting, no Your Quests, no follow feed.
export default async function HomePage() {
  const user = await getCurrentUser();
  const [profile, yourQuests, home] = await Promise.all([
    user ? getMyProfile(user.id) : null,
    user ? getYourQuests() : [],
    getHome(Boolean(user)),
  ]);
  return (
    <HomeView
      signedIn={Boolean(user)}
      name={profile?.name ?? null}
      yourQuests={yourQuests}
      feed={home.feed}
      suggested={home.suggested}
    />
  );
}
