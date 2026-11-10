import type { QuestCard } from '@/lib/trip/cards';

export type QuestFilter = 'all' | 'published' | 'drafts';

/** All / Published / Drafts on Your Quests. */
export function matchesFilter(filter: QuestFilter, quest: Pick<QuestCard, 'status'>): boolean {
  return filter === 'all' || (filter === 'published') === (quest.status === 'published');
}

/** The tag on a card: Draft, Unlisted or Private. Public Quests have none. */
export function questTag(quest: Pick<QuestCard, 'status' | 'visibility'>): string | null {
  if (quest.status === 'draft') return 'Draft';
  if (quest.visibility === 'unlisted') return 'Unlisted';
  if (quest.visibility === 'private') return 'Private';
  return null;
}
