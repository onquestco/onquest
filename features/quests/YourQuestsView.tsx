'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PlusIcon } from '@/design-system/components/icons';
import { placeholderImage } from '@/lib/demo/placeholderImages';
import { Segmented } from '@/design-system/components/Segmented';
import { Toast } from '@/design-system/components/Toast';
import type { BlogCard } from '@/lib/blog/cards';
import type { QuestCard } from '@/lib/trip/cards';
import { ManageQuestSheet } from './ManageQuestSheet';
import { matchesFilter, type QuestFilter as Filter } from './questFilters';
import { QuestTile, tileMeta } from './QuestTile';
import { YourBlogsList } from './YourBlogsList';

const EMPTY: Record<Filter, string> = {
  all: 'No Quests yet. Your next trip starts here.',
  published: 'Nothing published yet.',
  drafts: 'No drafts. Quests you start and leave show up here.',
};

type Props = {
  initial: QuestCard[];
  manage?: string;
  /** Your blogs, drafts included (list_my_blogs). */
  blogs?: BlogCard[];
  /** has_feature_access('blogs'). */
  canWriteBlogs?: boolean;
};

/**
 * Screen 20: every Quest you've made, and every blog behind a Quests · Blogs switch (blogs spec
 * §6.3). The switch shows only to people who can write a blog or have one; without it the tab is
 * exactly as before.
 */
export function YourQuestsView({ initial, manage, blogs = [], canWriteBlogs = false }: Props) {
  const [tab, setTab] = useState<'quests' | 'blogs'>('quests');
  if (!canWriteBlogs && blogs.length === 0)
    return (
      <main className="mx-auto flex max-w-lg md:max-w-3xl flex-col gap-6 px-4 py-4">
        <YourQuests initial={initial} manage={manage} />
      </main>
    );
  return (
    <main className="mx-auto flex max-w-lg md:max-w-3xl flex-col gap-6 px-4 py-4">
      <Segmented
        label="Quests or blogs"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'quests', label: 'Quests' },
          { value: 'blogs', label: 'Blogs' },
        ]}
      />
      {/* Both stay mounted, so switching back keeps the filter and an open ⋯ as they were. */}
      <div hidden={tab !== 'quests'} className="flex flex-col gap-6">
        <YourQuests initial={initial} manage={manage} />
      </div>
      <div hidden={tab !== 'blogs'} className="flex flex-col gap-6">
        <YourBlogsList blogs={blogs} canWriteBlogs={canWriteBlogs} />
      </div>
    </main>
  );
}

/** All / Published / Drafts and ⋯ on every Quest. */
function YourQuests({ initial, manage }: { initial: QuestCard[]; manage?: string }) {
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
    <>
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
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
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
            setNotice(open.status === 'draft' ? 'Draft deleted.' : 'Quest deleted.');
          }}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(undefined)} />}
    </>
  );
}
