import type { HomeFeedItem } from '@/lib/social/schema';

/**
 * A "Load more" page added to the feed on screen: Quests and blogs in the server's order (blogs
 * spec S2), skipping anything already shown (scores move a little between pages).
 */
export function appendFeedPage(shown: HomeFeedItem[], page: HomeFeedItem[]): HomeFeedItem[] {
  const seen = new Set(shown.map((item) => item.key));
  return [...shown, ...page.filter((item) => !seen.has(item.key))];
}
