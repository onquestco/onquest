'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Segmented } from '@/design-system/components/Segmented';

type Filter = 'all' | 'published' | 'drafts';

const EMPTY: Record<Filter, string> = {
  all: 'No Quests yet. Your next trip starts here.',
  published: 'Nothing published yet.',
  drafts: 'No drafts. Quests you start and leave show up here.',
};

/** Screen 20 on no data yet: the Create card and the filter. The grid comes with saved Quests (C-04). */
export function YourQuestsView() {
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-4">
      <h1 className="text-title text-ink">Your Quests</h1>
      <Link href="/quests/new" className="flex flex-col gap-1 rounded-lg border-2 border-brand-strong bg-brand-wash p-4">
        <span className="text-lead font-semibold text-ink">Create a Quest</span>
        <span className="text-label font-normal text-ink-muted">Pick 3 to 15 photos from a trip</span>
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
      <p className="text-body text-ink-muted">{EMPTY[filter]}</p>
    </main>
  );
}
