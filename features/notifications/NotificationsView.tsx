import Link from 'next/link';
import { Avatar } from '@/design-system/components/Avatar';
import { buttonClassName } from '@/design-system/components/Button';
import { HeartIcon } from '@/design-system/components/icons';
import { TopBar } from '@/design-system/components/TopBar';
import type { NotificationItem } from '@/lib/social/schema';
import { notificationHref, notificationText, timeAgo } from './notificationText';

type Props = {
  items: NotificationItem[];
  now: Date;
  /** Link to the next, older page when this one is full. */
  olderHref?: string;
};

/** The bell's list (B-08): likes, comments and follows, newest first, unread ones tinted. */
export function NotificationsView({ items, now, olderHref }: Props) {
  return (
    <main className="mx-auto flex max-w-lg flex-col">
      <TopBar title="Notifications" fallback="/home" />
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <h2 className="text-lead font-semibold text-ink">Nothing yet</h2>
          <p className="text-body text-ink-muted">
            When friends like or comment on your Quests, you&apos;ll see it here and get an email.
          </p>
          <Link href="/quests" className={buttonClassName({ variant: 'secondary' })}>
            Your Quests
          </Link>
        </div>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={notificationHref(item)}
                className={`flex min-h-16 items-start gap-3 border-b border-line px-4 py-3 ${item.unread ? 'bg-brand-wash' : 'bg-surface'}`}
              >
                {item.kind === 'like' || !item.actor ? (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-brand-tint text-brand-strong">
                    <HeartIcon size={20} filled />
                  </span>
                ) : (
                  <Avatar name={item.actor.name} src={item.actor.avatarUrl} size={40} />
                )}
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-body text-ink">{notificationText(item)}</span>
                  <span className="text-caption text-ink-muted">{timeAgo(item.savedAt, now)}</span>
                </span>
                {item.unread && (
                  <span className="mt-2 size-2 shrink-0 rounded-pill bg-brand-strong">
                    <span className="sr-only">Unread</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {olderHref && (
        <Link href={olderHref} className={`${buttonClassName({ variant: 'quiet', block: true })} my-4`}>
          Show older
        </Link>
      )}
    </main>
  );
}
