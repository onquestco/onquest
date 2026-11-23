'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/design-system/components/Button';
import { Logo } from '@/design-system/components/Logo';
import { askToSignIn } from '@/features/account/signInPrompt';
import { BellBadge } from '@/features/notifications/BellBadge';

// The prototype's top bar on the tabs: the logo on Home, the tab's name elsewhere, and the bell.
const TITLES: Record<string, string> = { '/explore': 'Explore', '/quests': 'Your Quests' };

/** Signed out (OQ-16) the bell becomes a Sign in button: there's nothing to be notified about. */
export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const title = TITLES[pathname];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-lg md:max-w-3xl items-center justify-between px-4 py-1">
        {title ? (
          <h1 className="text-title text-ink">{title}</h1>
        ) : (
          <Link href="/home" aria-label="OnQuest home">
            <Logo />
          </Link>
        )}
        {signedIn ? (
          <BellBadge />
        ) : (
          <Button
            variant="secondary"
            className="min-h-9 px-3.5 py-1.5 text-label"
            onClick={() => askToSignIn()}
          >
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
