import type { Metadata } from 'next';
import { NotificationsView } from '@/features/notifications/NotificationsView';
import { sampleNotifications } from '@/lib/demo/sampleSocial';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Notifications | ${SITE_NAME}`, robots: { index: false } };

// Sample items until B-06's loader (getNotifications + mark seen) exists.
export default function NotificationsPage() {
  return <NotificationsView items={sampleNotifications} now={new Date()} />;
}
