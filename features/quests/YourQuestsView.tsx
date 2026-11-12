'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MoreIcon, PlusIcon } from '@/design-system/components/icons';
import { Segmented } from '@/design-system/components/Segmented';
import { Toast } from '@/design-system/components/Toast';
import type { QuestCard } from '@/lib/trip/cards';
import { ManageQuestSheet } from './ManageQuestSheet';
import { matchesFilter, questTag, type QuestFilter as Filter } from './questFilters';

const EMPTY: Record<Filter, string> = {
  all: 'No Quests yet. Your next trip starts here.',
  published: 'Nothing published yet.',
  drafts: 'No drafts. Quests you start and leave show up here.',
};

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-pill bg-surface px-2 py-0.5 text-caption font-semibold text-ink">
      {children}
    </span>
  );
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function Card({ quest, onManage }: { quest: QuestCard; onManage: () => void }) {
  const draft = quest.status === 'draft';
  const tag = questTag(quest);
  const meta = draft
    ? 'Continue editing'
    : `${plural(quest.likeCount, 'like')} · ${plural(quest.commentCount, 'comment')}`;
  return (
    <li className="relative">
      {/* Title and counts sit on the cover, like every other Quest card (prototype screen 20). */}
      <Link
        href={draft ? `/quests/${quest.key}/review` : (quest.path ?? `/quests/${quest.key}/review`)}
        className="relative block aspect-4/5 overflow-hidden rounded-lg bg-night-band"
      >
        {quest.coverThumb && <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-linear-to-t from-night-band via-transparent to-transparent" />
        <span className="absolute inset-x-3 bottom-3 flex flex-col text-on-night">
          <span className="line-clamp-2 text-label font-semibold">{quest.title}</span>
          <span className="truncate text-caption text-on-night-muted">{meta}</span>
        </span>
      </Link>
      {tag && (
        <span className="absolute top-2 left-2">
          <Tag>{tag}</Tag>
        </span>
      )}
      {!draft && (
        <button
          type="button"
          aria-label={`Manage ${quest.title}`}
          onClick={onManage}
          className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-pill text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
        >
          <span className="flex size-8 items-center justify-center rounded-pill bg-surface shadow-float">
            <MoreIcon size={20} />
          </span>
        </button>
      )}
    </li>
  );
}

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
      <h1 className="text-title text-ink">Your Quests</h1>
      <Link
        href="/quests/new?source=quests_tab"
        className="flex items-center gap-4 rounded-lg border-2 border-dashed border-brand-strong bg-brand-wash p-4"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-brand-strong text-on-brand shadow-brand">
          <PlusIcon size={24} />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-lead font-semibold text-ink">Create a Quest</span>
          <span className="text-label font-normal text-ink-muted">Pick 3 to 15 photos from a trip</span>
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
        <ul className="grid grid-cols-2 gap-4">
          {shown.map((quest) => (
            <Card key={quest.key} quest={quest} onManage={() => setManaging(quest.key)} />
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
