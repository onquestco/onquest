import type { NotificationItem } from '@/lib/social/schema';

// What each bell item says and where it goes (spec B §3.5; blogs spec §3.6). Likes never name the
// person. A like or comment is about a blog (item.blog) or a Quest (item.quest).

export function notificationText(item: NotificationItem): string {
  const yours = item.blog ? 'your blog' : 'your Quest';
  const title = (item.blog ?? item.quest)?.title ?? yours;
  const name = item.actor?.name ?? 'Someone';
  if (item.kind === 'like') {
    const count = item.likeCount ?? 1;
    return count > 1 ? `${count} people liked ${title}` : `Someone liked ${title}`;
  }
  if (item.kind === 'follow') return `${name} started following you`;
  // A deleted comment has no excerpt left: say what happened, not what was said.
  return item.commentExcerpt
    ? `${name} commented on ${title}: "${item.commentExcerpt}"`
    : `${name} commented on ${yours}`;
}

export function notificationHref(item: NotificationItem): string {
  if (item.kind === 'follow') return item.actor ? `/@${item.actor.handle}` : '/home';
  const subject = item.blog ?? item.quest;
  if (!subject) return '/home';
  return item.kind === 'comment' ? `${subject.path}#comments` : subject.path;
}

/** "Just now", "4m", "3h", "2d", then a date. */
export function timeAgo(savedAt: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(savedAt).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(savedAt));
}
