import type { NotificationItem } from '@/lib/social/schema';

// What each bell item says and where it goes (spec B §3.5). Likes never name the person.

export function notificationText(item: NotificationItem): string {
  const title = item.quest?.title ?? 'your Quest';
  const name = item.actor?.name ?? 'Someone';
  if (item.kind === 'like') {
    const count = item.likeCount ?? 1;
    return count > 1 ? `${count} people liked ${title}` : `Someone liked ${title}`;
  }
  if (item.kind === 'follow') return `${name} started following you`;
  // A deleted comment has no excerpt left: say what happened, not what was said.
  return item.commentExcerpt ? `${name} commented on ${title}: "${item.commentExcerpt}"` : `${name} commented on your Quest`;
}

export function notificationHref(item: NotificationItem): string {
  if (item.kind === 'follow') return item.actor ? `/@${item.actor.handle}` : '/home';
  if (!item.quest) return '/home';
  return item.kind === 'comment' ? `${item.quest.path}#comments` : item.quest.path;
}

/** "Just now", "4m", "3h", "2d", then a date. */
export function timeAgo(savedAt: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(savedAt).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(
    new Date(savedAt),
  );
}
