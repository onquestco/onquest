import type { BlogViewer } from '@/lib/social/schema';
import type { QuestCard } from '@/lib/trip/cards';

export type LinkedQuestView = {
  /** The card to draw; absent when only the writer's note shows (the Quest was deleted). */
  quest?: QuestCard;
  /** "Your linked Quest isn't visible to readers" (writer only). */
  hiddenNote: boolean;
};

/**
 * What "From this trip" shows (spec §6.2, D12). Readers get the card get_blog_quest allowed, or
 * nothing. The writer, when readers can't see it (deleted, private, or unlisted on a public blog),
 * gets their own card if the Quest still exists, with the note.
 */
export function linkedQuestView(readerQuest: QuestCard | null, viewer: BlogViewer | null): LinkedQuestView | null {
  if (viewer?.isOwner && viewer.linkedQuestHidden) {
    return { quest: viewer.ownLinkedQuest, hiddenNote: true };
  }
  return readerQuest ? { quest: readerQuest, hiddenNote: false } : null;
}
