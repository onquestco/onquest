import { unstable_cache } from 'next/cache';
import { blogQuestsTag } from '@/lib/cacheTags';
import { toQuestCards } from '@/lib/social/cardRows';
import { createPublicSupabase } from '@/lib/supabase/public';
import type { QuestCard } from '@/lib/trip/cards';

/**
 * The card under "From this trip", or null when readers may not see the linked Quest (spec D12).
 * Cached under the writer's blog-quests tag, which any of their Quest publishes, visibility
 * changes and deletes refresh, as well as their blog Posts.
 */
export function getLinkedQuest(blogKey: string, ownerKey: string): Promise<QuestCard | null> {
  return unstable_cache(
    async () => {
      const { data, error } = await createPublicSupabase().rpc('get_blog_quest', { p_blog_key: blogKey });
      if (error) throw new Error('Could not load linked Quest');
      return data === null ? null : (toQuestCards([data])[0] ?? null);
    },
    ['blog-quest', blogKey],
    { tags: [blogQuestsTag(ownerKey)] },
  )();
}
