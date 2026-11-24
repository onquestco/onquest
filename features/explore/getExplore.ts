import { unstable_cache } from 'next/cache';
import { publishedGuides, toGuideCard } from '@/features/guides/guides';
import { EXPLORE_TAG } from '@/lib/cacheTags';
import { toBlogCards, toPeople, toQuestCards } from '@/lib/social/cardRows';
import { createPublicSupabase } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';

const FIVE_MINUTES = 300;

// The same for everyone: cached for 5 minutes, and refreshed by publishes and deletes (tag explore).
// Blogs go under "Stories and guides" after the guides (blogs spec §3.5).
const getPublicExplore = unstable_cache(
  async () => {
    const supabase = createPublicSupabase();
    const [trending, chips, blogs] = await Promise.all([
      supabase.rpc('list_trending_quests', { p_limit: 12 }),
      supabase.rpc('list_place_chips', { p_limit: 8 }),
      supabase.rpc('list_explore_blogs', { p_limit: 6 }),
    ]);
    if (trending.error || chips.error) throw new Error('Could not load Explore');
    return {
      trending: toQuestCards(trending.data),
      chips: (chips.data as string[] | null) ?? [],
      // Blogs are extra: if they can't load, Explore still shows everything else (BL-02 review).
      blogs: blogs.error ? [] : toBlogCards(blogs.data),
    };
  },
  // A new key for the new shape: entries cached by the previous release have no blogs.
  ['explore', 'with-blogs'],
  { tags: [EXPLORE_TAG], revalidate: FIVE_MINUTES },
);

/** Explore (screen 14): place chips, trending Quests, public blogs, and travellers the viewer doesn't follow yet. */
export async function getExplore() {
  const supabase = await createServerSupabase();
  const [shared, travellers] = await Promise.all([
    getPublicExplore(),
    supabase.rpc('list_travellers_to_follow', { p_limit: 6 }),
  ]);
  if (travellers.error) throw new Error('Could not load travellers');
  const guides = publishedGuides().slice(0, 6).map(toGuideCard);
  return { ...shared, travellers: toPeople(travellers.data), guides };
}
