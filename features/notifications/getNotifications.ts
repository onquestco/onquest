import { createServerSupabase } from '@/lib/supabase/server';
import { toNotificationItems } from './notificationRows';

export const NOTIFICATIONS_PAGE_SIZE = 30;

/** The signed-in person's bell, newest first. Dynamic: never cached. */
export async function getNotifications(before?: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_my_notifications', {
    p_limit: NOTIFICATIONS_PAGE_SIZE,
    p_before: before ?? null,
  });
  if (error) throw new Error('Could not load notifications');
  return toNotificationItems(data);
}
