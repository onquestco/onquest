import type { HomeFeedItem } from '@/lib/social/schema';

type QuestFeedItem = Extract<HomeFeedItem, { type: 'quest' }>;

/**
 * The Quest items of a Home feed page, in order. Blog items arrive with BL-02 but their card comes
 * in BL-05 (blogs spec §6.3): until then Home shows exactly the Quest cards it showed before.
 */
export function questFeedItems(items: HomeFeedItem[]): QuestFeedItem[] {
  return items.filter((item): item is QuestFeedItem => item.type === 'quest');
}
