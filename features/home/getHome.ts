import { withPublicExcerpt } from '@/features/blogs/cardExcerpts';
import { toHomeFeedItems, toQuestCards } from '@/lib/social/cardRows';
import type { FeedPage } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';
import type { QuestCard } from '@/lib/trip/cards';

export const FEED_PAGE_SIZE = 10;
const SUGGESTIONS = 6;
const SIGNED_OUT_SUGGESTIONS = 10; // the most the function returns: it's the whole page signed out

/**
 * One page of the Home feed (spec C §3.4): Quests and public blogs from people you follow, in one
 * order (blogs spec S2). `now` is fixed by the first page and passed back by "Load more", so the
 * order doesn't shift between pages. Signed in only; never cached.
 */
export async function getFeedPage(now: string, offset: number): Promise<FeedPage> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_home_feed', {
    p_now: now,
    p_limit: FEED_PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw new Error('Could not load the feed');
  // Blog excerpts from the posted body, so they never show raw formatting (cardExcerpts.ts).
  const items = await Promise.all(
    toHomeFeedItems(data).map((item) => (item.type === 'blog' ? withPublicExcerpt(item) : item)),
  );
  return { items, nextOffset: items.length === FEED_PAGE_SIZE ? offset + items.length : null, now };
}

async function getSuggestions(limit: number): Promise<QuestCard[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_suggested_quests', { p_limit: limit });
  if (error) throw new Error('Could not load suggestions');
  return toQuestCards(data);
}

/**
 * Home (screen 11): the first feed page and "Suggested for you". Either failing leaves the rest
 * of Home working: the feed says it couldn't load, suggestions are left out. Signed out there's
 * no one followed, so no feed, only suggestions (OQ-16).
 */
export async function getHome(signedIn: boolean): Promise<{ feed: FeedPage | null; suggested: QuestCard[] }> {
  const [feed, suggested] = await Promise.allSettled([
    signedIn ? getFeedPage(new Date().toISOString(), 0) : Promise.resolve(null),
    getSuggestions(signedIn ? SUGGESTIONS : SIGNED_OUT_SUGGESTIONS),
  ]);
  return {
    feed: feed.status === 'fulfilled' ? feed.value : null,
    suggested: suggested.status === 'fulfilled' ? suggested.value : [],
  };
}
