import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { BellIcon } from '@/design-system/components/icons';
import { Logo } from '@/design-system/components/Logo';

/** Logo, the bell (unread count comes with notifications, B-06) and the person's avatar. */
export function AppHeader({ handle, name }: { handle: string; name: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
        <Link href="/home" aria-label="OnQuest home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/notifications" aria-label="Notifications" className="flex size-11 items-center justify-center text-ink">
            <BellIcon />
          </Link>
          <Link href={`/@${handle}`} aria-label="Your profile" className="flex size-11 items-center justify-center">
            <Avatar name={name || handle} />
          </Link>
        </div>
      </div>
    </header>
  );
}
