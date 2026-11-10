import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { Logo } from '@/design-system/components/Logo';
import { BellBadge } from '@/features/notifications/BellBadge';

/** Logo, the bell with its unread count, and the person's avatar. */
export function AppHeader({ handle, name }: { handle: string; name: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
        <Link href="/home" aria-label="OnQuest home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <BellBadge />
          <Link
            href={`/@${handle}`}
            aria-label="Your profile"
            className="flex size-11 items-center justify-center"
          >
            <Avatar name={name || handle} />
          </Link>
        </div>
      </div>
    </header>
  );
}
