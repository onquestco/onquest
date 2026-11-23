'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BottomBar } from '@/design-system/components/BottomBar';
import { ExploreIcon, HomeIcon, PlusIcon, ProfileIcon, QuestsIcon } from '@/design-system/components/icons';
import { askToSignIn } from '@/features/account/signInPrompt';

/**
 * Home · Explore · Create · Quests · Profile. Only on the tab screens; the create flow has none.
 * Signed out (no handle, OQ-16) Create, Quests and Profile open the sign-in popup: the links go
 * to pages that need an account, which SignInSheet catches.
 */
export function AppBottomBar({ handle }: { handle: string | null }) {
  const path = usePathname();
  const router = useRouter();
  const profile = handle ? `/@${handle}` : '/login?next=%2Fhome';
  const tab = (href: string, label: string, icon: ReactNode) => ({
    href,
    label,
    icon,
    active: path === href,
  });

  return (
    <BottomBar
      left={[tab('/home', 'Home', <HomeIcon key="i" />), tab('/explore', 'Explore', <ExploreIcon key="i" />)]}
      right={[
        tab('/quests', 'Quests', <QuestsIcon key="i" />),
        tab(profile, 'Profile', <ProfileIcon key="i" />),
      ]}
      action={{
        label: 'Create',
        icon: <PlusIcon size={28} />,
        onClick: () =>
          handle ? router.push('/create') : askToSignIn({ intent: 'make_your_own', next: '/quests/new' }),
      }}
    />
  );
}
