import { unstable_cache } from 'next/cache';
import { tripUrlTag } from '@/lib/cacheTags';
import { HANDLE_PATTERN } from '@/lib/handles';
import { createPublicSupabase } from '@/lib/supabase/public';

export type QuestStatus = 'private' | 'removed';

/**
 * Why a Quest link shows nothing: private, removed, or null (unknown: a real 404). Cached with the
 * page under the URL's tag, which publish, visibility changes and delete all refresh. What depends
 * on who is looking (the owner's way in, the quest_unavailable event) is asked from the browser.
 */
export async function getQuestStatus(rawHandle: string, rawSlug: string): Promise<QuestStatus | null> {
  const handle = rawHandle.toLowerCase();
  const slug = rawSlug.toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) return null;
  return unstable_cache(
    async () => {
      const { data, error } = await createPublicSupabase().rpc('get_trip_status', {
        p_handle: handle,
        p_slug: slug,
      });
      if (error) throw new Error('Could not load Quest status');
      return data === 'private' || data === 'removed' ? (data as QuestStatus) : null;
    },
    ['trip-status', handle, slug],
    { tags: [tripUrlTag(handle, slug)] },
  )();
}
