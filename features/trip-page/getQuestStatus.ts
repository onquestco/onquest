import { HANDLE_PATTERN } from '@/lib/handles';
import { createPublicSupabase } from '@/lib/supabase/public';

export type QuestStatus = 'private' | 'removed';

/**
 * Why a Quest link shows nothing: private, removed, or null (unknown: a real 404). Not cached, so
 * the quest_unavailable event fires per visit (spec B §3.2).
 */
export async function getQuestStatus(handle: string, slug: string): Promise<QuestStatus | null> {
  if (!HANDLE_PATTERN.test(handle.toLowerCase())) return null;
  const { data, error } = await createPublicSupabase().rpc('get_trip_status', {
    p_handle: handle,
    p_slug: slug,
  });
  if (error) throw new Error('Could not load Quest status');
  return data === 'private' || data === 'removed' ? data : null;
}
