import { createServerSupabase } from '@/lib/supabase/server';
import { toNotificationItems } from './notificationRows';

/** The signed-in person's bell, newest first. Dynamic: never cached. */
export async function getNotifications(before?: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_my_notifications', {
    p_limit: 30,
    p_before: before ?? null,
  });
  if (error) throw new Error('Could not load notifications');
  return toNotificationItems(data);
}
