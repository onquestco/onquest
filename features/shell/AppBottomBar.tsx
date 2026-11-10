'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BottomBar } from '@/design-system/components/BottomBar';
import { ExploreIcon, HomeIcon, PlusIcon, ProfileIcon, QuestsIcon } from '@/design-system/components/icons';
import { CreateChooser } from './CreateChooser';

/** Home · Explore · Create · Quests · Profile. Only on the tab screens; the create flow has none. */
export function AppBottomBar({ handle }: { handle: string }) {
  const path = usePathname();
  const [creating, setCreating] = useState(false);
  const profile = `/@${handle}`;
  const tab = (href: string, label: string, icon: ReactNode) => ({
    href,
    label,
    icon,
    active: path === href,
  });

  return (
    <>
      <BottomBar
        left={[
          tab('/home', 'Home', <HomeIcon key="i" />),
          tab('/explore', 'Explore', <ExploreIcon key="i" />),
        ]}
        right={[
          tab('/quests', 'Quests', <QuestsIcon key="i" />),
          tab(profile, 'Profile', <ProfileIcon key="i" />),
        ]}
        action={{ label: 'Create', icon: <PlusIcon size={28} />, onClick: () => setCreating(true) }}
      />
      {creating && <CreateChooser onClose={() => setCreating(false)} />}
    </>
  );
}
