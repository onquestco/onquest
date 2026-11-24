import { unstable_cache } from 'next/cache';
import { toQuestSocial } from '@/features/trip-page/socialRows';
import { blogSocialTag } from '@/lib/cacheTags';
import type { QuestSocial } from '@/lib/social/schema';
import { createPublicSupabase } from '@/lib/supabase/public';

/**
 * Likes and comments for a posted public or unlisted blog, cached apart from the page (tag
 * blog-social:{key}). get_blog_social has get_trip_social's shape, so the Quest parser reads it.
 */
export function getBlogSocial(blogKey: string): Promise<QuestSocial | null> {
  return unstable_cache(
    async () => {
      const { data, error } = await createPublicSupabase().rpc('get_blog_social', { p_blog_key: blogKey });
      // Throwing keeps a database hiccup out of the cache.
      if (error) throw new Error('Could not load likes and comments');
      return data === null ? null : toQuestSocial(data);
    },
    ['blog-social', blogKey],
    { tags: [blogSocialTag(blogKey)] },
  )();
}
