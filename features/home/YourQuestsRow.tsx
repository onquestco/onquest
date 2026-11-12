'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MoreIcon } from '@/design-system/components/icons';
import { ManageQuestSheet } from '@/features/quests/ManageQuestSheet';
import { questTag } from '@/features/quests/questFilters';
import type { QuestCard } from '@/lib/trip/cards';

/** Home's "Your Quests": a sideways row, drafts to continue and published ones with ⋯. */
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
      {quests.length === 0 && (
        <p className="text-body text-ink-muted">No Quests yet. Your next trip starts here.</p>
      )}
      {quests.length > 0 && (
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {quests.map((quest) => {
            const draft = quest.status === 'draft';
            const tag = questTag(quest);
            return (
              <li key={quest.key} className="relative flex w-36 shrink-0 flex-col gap-1">
                <Link
                  href={draft ? `/quests/${quest.key}/review` : (quest.path ?? '/quests')}
                  className="relative block aspect-4/5 overflow-hidden rounded-lg bg-night-band"
                >
                  {quest.coverThumb && (
                    <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />
                  )}
                  {/* Title on the cover, like the prototype's Home row. */}
                  <span className="absolute inset-0 bg-linear-to-t from-night-band via-transparent to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 flex flex-col text-on-night">
                    <span className="line-clamp-2 text-label font-semibold">{quest.title}</span>
                    {draft && <span className="text-caption text-on-night-muted">Continue editing</span>}
                  </span>
                </Link>
                {tag && (
                  <span className="absolute top-2 left-2 rounded-pill bg-surface px-2 py-0.5 text-caption font-semibold text-ink">
                    {tag}
                  </span>
                )}
                {!draft && (
                  <button
                    type="button"
                    aria-label={`Manage ${quest.title}`}
                    onClick={() => setManaging(quest.key)}
                    className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-pill text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
                  >
                    <span className="flex size-8 items-center justify-center rounded-pill bg-surface shadow-float">
                      <MoreIcon size={20} />
                    </span>
                  </button>
                )}
              </li>
            );
          })}
          <li className="flex w-36 shrink-0">
            <Link
              href="/quests/new?source=home_empty"
              className="flex aspect-4/5 w-full items-center justify-center rounded-lg border-2 border-dashed border-brand-strong text-label font-semibold text-brand-strong"
            >
              + Create a Quest
            </Link>
          </li>
        </ul>
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
          }}
        />
      )}
    </section>
  );
}
