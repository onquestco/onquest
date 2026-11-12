import { unstable_cache } from 'next/cache';
import { GUIDE_QUESTS_TAG } from '@/lib/cacheTags';
import { toQuestCards } from '@/lib/social/cardRows';
import { createPublicSupabase } from '@/lib/supabase/public';
import type { QuestCard } from '@/lib/trip/cards';

/**
 * "Quests from this guide": only those still public and published (list_quest_cards), cached
 * for an hour and refreshed by any publish, visibility change or delete (tag guide-quests).
 */
export function getGuideQuests(keys: string[]): Promise<QuestCard[]> {
  if (keys.length === 0) return Promise.resolve([]);
  return unstable_cache(
    async () => {
      const { data, error } = await createPublicSupabase().rpc('list_quest_cards', { p_keys: keys });
      if (error) throw new Error('Could not load guide Quests');
      return toQuestCards(data);
    },
    ['guide-quests', ...keys],
    { tags: [GUIDE_QUESTS_TAG], revalidate: 3600 },
  )();
}
