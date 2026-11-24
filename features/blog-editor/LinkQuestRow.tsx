'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from 'zustand';
import { QuestsIcon } from '@/design-system/components/icons';
import { track } from '@/lib/analytics/client';
import type { QuestCard } from '@/lib/trip/cards';
import type { BlogDraftSaver } from './blogDraftSaver';
import type { BlogDraftStore } from './blogDraftStore';
import { LinkQuestSheet } from './LinkQuestSheet';

const row =
  'flex min-h-12 w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-strong';

/** "Link a Quest" (PRD B4); once chosen, a small card with the cover, title and Remove. */
export function LinkQuestRow({
  store,
  saver,
  quests,
}: {
  store: BlogDraftStore;
  saver: BlogDraftSaver;
  quests: QuestCard[];
}) {
  const router = useRouter();
  const key = useStore(store, (state) => state.key);
  const linkedKey = useStore(store, (state) => state.document.linkedQuestKey);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // A Quest that's no longer published isn't in the list: the row offers a new choice, and
  // publish_blog drops the old link.
  const linked = quests.find((quest) => quest.key === linkedKey);

  function choose(quest: QuestCard) {
    store.getState().change({ linkedQuestKey: quest.key });
    track('blog_quest_linked', { blog_id: key, action: 'link' });
    setOpen(false);
  }

  function remove() {
    store.getState().change({ linkedQuestKey: undefined });
    track('blog_quest_linked', { blog_id: key, action: 'remove' });
  }

  async function createQuest() {
    setCreating(true);
    // The blog is kept before leaving for the Quest flow (PRD B3).
    await saver.saveNow({ force: store.getState().draftSavedAt === null });
    router.push('/quests/new?source=blog_link');
  }

  return (
    <>
      {linked ? (
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Linked Quest: ${linked.title}. Change`}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            {linked.coverThumb && (
              <img src={linked.coverThumb} alt="" className="size-12 shrink-0 rounded-sm bg-surface-page object-cover" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="text-caption text-ink-muted">From this trip</span>
              <span className="truncate text-body font-semibold text-ink">{linked.title}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={remove}
            className="min-h-11 shrink-0 rounded-pill px-3 text-label font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            Remove
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={row}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-wash text-brand-strong">
            <QuestsIcon size={20} />
          </span>
          <span className="flex-1 text-body font-semibold text-ink">Link a Quest</span>
        </button>
      )}
      <LinkQuestSheet
        open={open}
        quests={quests}
        linkedKey={linkedKey}
        onChoose={choose}
        onCreateQuest={() => void createQuest()}
        creating={creating}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
