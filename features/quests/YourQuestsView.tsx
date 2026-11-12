'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PlusIcon } from '@/design-system/components/icons';
import { placeholderImage } from '@/lib/demo/placeholderImages';
import { Segmented } from '@/design-system/components/Segmented';
import { Toast } from '@/design-system/components/Toast';
import type { QuestCard } from '@/lib/trip/cards';
import { ManageQuestSheet } from './ManageQuestSheet';
import { matchesFilter, type QuestFilter as Filter } from './questFilters';
import { QuestTile, tileMeta } from './QuestTile';

const EMPTY: Record<Filter, string> = {
  all: 'No Quests yet. Your next trip starts here.',
  published: 'Nothing published yet.',
  drafts: 'No drafts. Quests you start and leave show up here.',
};

/** Screen 20: every Quest you've made, with All / Published / Drafts and ⋯ on published ones. */
export function YourQuestsView({ initial, manage }: { initial: QuestCard[]; manage?: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [quests, setQuests] = useState(initial);
  // The server's list after a reload (e.g. a conflict): take it.
  const [loaded, setLoaded] = useState(initial);
  if (initial !== loaded) {
    setLoaded(initial);
    setQuests(initial);
  }
  // ⋯ on your own Quest page lands here with ?manage=<key> (screen 19).
  const [managing, setManaging] = useState<string | undefined>(manage);
  const [notice, setNotice] = useState<string>();
  const shown = quests.filter((quest) => matchesFilter(filter, quest));
  const open = quests.find((quest) => quest.key === managing);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-4">
      <Link
        href="/quests/new?source=quests_tab"
        className="flex items-center gap-4 rounded-lg border-2 border-dashed border-brand-strong bg-brand-wash p-4"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-brand-strong text-on-brand shadow-brand">
          <PlusIcon size={24} />
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-lead font-semibold text-ink">Create a Quest</span>
          <span className="text-label font-normal text-ink-muted">Pick 3 to 15 photos from a trip</span>
        </span>
        <span aria-hidden className="relative h-14 w-16 shrink-0">
          <img
            src={placeholderImage('beach', 2)}
            alt=""
            className="absolute top-0 left-0 h-12 w-10 -rotate-6 bg-surface object-cover p-0.5 pb-2 shadow-photo"
          />
          <img
            src={placeholderImage('bonfire', 2)}
            alt=""
            className="absolute top-1 left-5 h-12 w-10 rotate-6 bg-surface object-cover p-0.5 pb-2 shadow-photo"
          />
        </span>
      </Link>
      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'published', label: 'Published' },
          { value: 'drafts', label: 'Drafts' },
        ]}
      />
      {shown.length === 0 ? (
        <p className="text-body text-ink-muted">{EMPTY[filter]}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {shown.map((quest) => (
            <li key={quest.key}>
              <QuestTile
                quest={quest}
                meta={tileMeta(quest, 'counts')}
                onManage={() => setManaging(quest.key)}
              />
            </li>
          ))}
        </ul>
      )}
      {quests.length > 0 && (
        <p className="text-label font-normal text-ink-muted">
          Every Quest you&apos;ve made, whoever can see it. Use ⋯ to edit, share, change who can see it, or
          delete.
        </p>
      )}
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
            setNotice('Quest deleted.');
          }}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(undefined)} />}
    </main>
  );
}
