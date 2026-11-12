import { unstable_cache } from 'next/cache';
import { tripSocialTag } from '@/lib/cacheTags';
import type { QuestSocial } from '@/lib/social/schema';
import { createPublicSupabase } from '@/lib/supabase/public';
import { toQuestSocial } from './socialRows';

/** Likes and comments for a published Quest, cached apart from the page (tag trip-social:{key}). */
export function getQuestSocial(tripKey: string): Promise<QuestSocial | null> {
  return unstable_cache(
    async () => {
      const { data, error } = await createPublicSupabase().rpc('get_trip_social', { p_trip_key: tripKey });
      // Throwing keeps a database hiccup out of the cache.
      if (error) throw new Error('Could not load likes and comments');
      return data === null ? null : toQuestSocial(data);
    },
    ['trip-social', tripKey],
    { tags: [tripSocialTag(tripKey)] },
  )();
}
