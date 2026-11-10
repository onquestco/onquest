import type { Metadata } from 'next';
import { z } from 'zod';
import { getNotifications, NOTIFICATIONS_PAGE_SIZE } from '@/features/notifications/getNotifications';
import { MarkSeen } from '@/features/notifications/MarkSeen';
import { NotificationsView } from '@/features/notifications/NotificationsView';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Notifications | ${SITE_NAME}`, robots: { index: false } };

type Props = { searchParams: Promise<{ before?: string }> };

// Signed in only (the (app) layout checks). The first page marks what it shows as seen.
export default async function NotificationsPage({ searchParams }: Props) {
  const before = z.iso.datetime({ offset: true }).safeParse((await searchParams).before);
  const items = await getNotifications(before.success ? before.data : undefined);
  const oldest = items.at(-1);
  const olderHref =
    items.length === NOTIFICATIONS_PAGE_SIZE && oldest
      ? `/notifications?before=${encodeURIComponent(oldest.savedAt)}`
      : undefined;

  return (
    <>
      <NotificationsView items={items} now={new Date()} olderHref={olderHref} />
      {!before.success && items[0] && <MarkSeen until={items[0].savedAt} />}
    </>
  );
}
