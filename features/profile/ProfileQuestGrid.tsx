'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { questCardMeta } from '@/design-system/components/QuestCardView';
import { loadQuestToManage } from '@/features/quests/actions';
import { ManageQuestSheet } from '@/features/quests/ManageQuestSheet';
import { QuestTile } from '@/features/quests/QuestTile';
import { QUEST_SOURCE_CODE } from '@/lib/analytics/codes';
import type { QuestCard } from '@/lib/trip/cards';
import { PublishedAgo } from './PublishedAgo';
import { useViewer } from './ProfileViewerContext';

/** The profile's Quests. On your own profile each has ⋯ to manage it right here (OQ-15). */
export function ProfileQuestGrid({ initial }: { initial: QuestCard[] }) {
  const viewer = useViewer();
  const router = useRouter();
  const [quests, setQuests] = useState(initial);
  const [open, setOpen] = useState<QuestCard>();
  const [loading, setLoading] = useState<string>();

  async function manage(key: string) {
    setLoading(key);
    const result = await loadQuestToManage({ key }).catch(() => null);
    setLoading(undefined);
    // Gone or not loadable: Your Quests has the full list and the same sheet.
    if (!result?.ok || !result.data) return router.push(`/quests?manage=${key}`);
    setOpen(result.data);
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {quests.map((quest) => (
          <li key={quest.key} aria-busy={loading === quest.key}>
            <QuestTile
              quest={quest}
              meta={
                quest.publishedAt ? (
                  <PublishedAgo iso={quest.publishedAt} />
                ) : (
                  questCardMeta(quest.pageCount, quest.photoCount)
                )
              }
              onManage={viewer?.isSelf ? () => void manage(quest.key) : undefined}
              src={QUEST_SOURCE_CODE.profile}
            />
          </li>
        ))}
      </ul>
      {open && (
        <ManageQuestSheet
          key={open.key}
          quest={open}
          onClose={() => setOpen(undefined)}
          onChange={(changed) => {
            setOpen(changed);
            // Only public Quests belong on a profile.
            if (changed.visibility !== 'public')
              setQuests((list) => list.filter((quest) => quest.key !== changed.key));
            router.refresh();
          }}
          onDeleted={() => {
            setQuests((list) => list.filter((quest) => quest.key !== open.key));
            setOpen(undefined);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
