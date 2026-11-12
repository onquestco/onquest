'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/design-system/components/Logo';
import { BellBadge } from '@/features/notifications/BellBadge';

// The prototype's top bar on the tabs: the logo on Home, the tab's name elsewhere, and the bell.
const TITLES: Record<string, string> = { '/explore': 'Explore', '/quests': 'Your Quests' };

export function AppHeader() {
  const pathname = usePathname();
  const title = TITLES[pathname];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-lg items-center justify-between px-4 py-1">
        {title ? (
          <h1 className="text-title text-ink">{title}</h1>
        ) : (
          <Link href="/home" aria-label="OnQuest home">
            <Logo />
          </Link>
        )}
        <BellBadge />
      </div>
    </header>
  );
}
