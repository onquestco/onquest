import { toFeedItems, toQuestCards } from '@/lib/social/cardRows';
import type { FeedPage } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';
import type { QuestCard } from '@/lib/trip/cards';

export const FEED_PAGE_SIZE = 10;
const SUGGESTIONS = 6;

/**
 * One page of the Home feed (spec C §3.4). `now` is fixed by the first page and passed back by
 * "Load more", so the order doesn't shift between pages. Signed in only; never cached.
 */
export async function getFeedPage(now: string, offset: number): Promise<FeedPage> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_feed', {
    p_now: now,
    p_limit: FEED_PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw new Error('Could not load the feed');
  const items = toFeedItems(data);
  return { items, nextOffset: items.length === FEED_PAGE_SIZE ? offset + items.length : null, now };
}

async function getSuggestions(): Promise<QuestCard[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_suggested_quests', { p_limit: SUGGESTIONS });
  if (error) throw new Error('Could not load suggestions');
  return toQuestCards(data);
}

/**
 * Home (screen 11): the first feed page and "Suggested for you". Either failing leaves the rest
 * of Home working: the feed says it couldn't load, suggestions are left out.
 */
export async function getHome(): Promise<{ feed: FeedPage | null; suggested: QuestCard[] }> {
  const [feed, suggested] = await Promise.allSettled([
    getFeedPage(new Date().toISOString(), 0),
    getSuggestions(),
  ]);
  return {
    feed: feed.status === 'fulfilled' ? feed.value : null,
    suggested: suggested.status === 'fulfilled' ? suggested.value : [],
  };
}
