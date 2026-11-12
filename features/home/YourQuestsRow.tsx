'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ManageQuestSheet } from '@/features/quests/ManageQuestSheet';
import { CreateTile, QuestTile, tileMeta } from '@/features/quests/QuestTile';
import type { QuestCard } from '@/lib/trip/cards';

/** Home's "Your Quests": the latest four as tiles, drafts to continue and published ones with ⋯. */
export function YourQuestsRow({ initial }: { initial: QuestCard[] }) {
  const [quests, setQuests] = useState(initial);
  const [managing, setManaging] = useState<string>();
  const open = quests.find((quest) => quest.key === managing);

  return (
    <section className="flex flex-col gap-2" aria-label="Your Quests">
      <div className="flex items-center justify-between">
        <h2 className="text-lead font-semibold text-ink">Your Quests</h2>
        {quests.length > 0 && (
          <Link href="/quests" className="min-h-11 content-center text-label text-brand-strong">
            See all
          </Link>
        )}
      </div>
      {/* The prototype's 2-column grid; "+ Create a Quest" fills the gap until something is published. */}
      <ul className="grid grid-cols-2 gap-3">
        {quests.slice(0, 4).map((quest) => (
          <li key={quest.key}>
            <QuestTile
              quest={quest}
              meta={tileMeta(quest, 'place')}
              onManage={() => setManaging(quest.key)}
            />
          </li>
        ))}
        {!quests.some((quest) => quest.status === 'published') && (
          <li>
            <CreateTile source="home_empty" />
          </li>
        )}
      </ul>
      {open && (
        <ManageQuestSheet
          key={open.key}
          quest={open}
          onClose={() => setManaging(undefined)}
          onChange={(changed) =>
            setQuests((list) => list.map((quest) => (quest.key === changed.key ? changed : quest)))
          }
          onDeleted={() => {
            setQuests((list) => list.filter((quest) => quest.key !== open.key));
            setManaging(undefined);
          }}
        />
      )}
    </section>
  );
}
