import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { AppBottomBar } from '@/features/shell/AppBottomBar';
import { AppHeader } from '@/features/shell/AppHeader';

// Home, Explore, Quests and Profile share the header and bottom bar. The create flow lives in
// app/(app)/(signed-in)/(create) and has neither. Home and Explore are open signed out (OQ-16).
export default async function TabsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const profile = user ? await getMyProfile(user.id) : null;
  if (user && !profile) redirect('/onboarding');
  return (
    <div className="min-h-svh bg-surface-page pb-24">
      <AppHeader signedIn={Boolean(user)} />
      {children}
      <AppBottomBar handle={profile?.handle ?? null} />
    </div>
  );
}
