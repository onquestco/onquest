'use client';

import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';

// "Link a Quest" (PRD B3): the writer's published Quests, newest first, one to choose. A public
// blog shows readers the card only for a public Quest (spec D12), so other rows say who sees it.

const TAGS: Record<Visibility, string> = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };

const NOTES: Partial<Record<Visibility, string>> = {
  unlisted: 'Shown only on unlisted blogs',
  private: 'Only you can see this one',
};

type Props = {
  open: boolean;
  quests: QuestCard[];
  linkedKey?: string;
  onChoose: (quest: QuestCard) => void;
  /** "Create a Quest" when there are none: the composer saves the draft first. */
  onCreateQuest: () => void;
  creating?: boolean;
  onClose: () => void;
};

export function LinkQuestSheet({ open, quests, linkedKey, onChoose, onCreateQuest, creating = false, onClose }: Props) {
  return (
    <Sheet open={open} title="Link a Quest" onClose={onClose}>
      <p className="-mt-2 text-body text-ink-muted">Readers see it at the end of your blog.</p>
      {quests.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="text-body text-ink">You haven&apos;t published a Quest yet.</p>
          <Button onClick={onCreateQuest} disabled={creating}>
            Create a Quest
          </Button>
        </div>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Your published Quests</legend>
          {quests.map((quest) => {
            const chosen = quest.key === linkedKey;
            const note = NOTES[quest.visibility];
            return (
              <label
                key={quest.key}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 has-focus-visible:outline-2 has-focus-visible:outline-brand-strong ${
                  chosen ? 'border-brand-strong bg-brand-wash' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="linked-quest"
                  value={quest.key}
                  checked={chosen}
                  onChange={() => onChoose(quest)}
                  className="sr-only"
                />
                {quest.coverThumb && (
                  <img src={quest.coverThumb} alt="" className="size-14 shrink-0 rounded-sm bg-surface-page object-cover" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold text-ink">{quest.title}</span>
                  {quest.places.length > 0 && (
                    <span className="truncate text-label font-normal text-ink-muted">{quest.places.join(' · ')}</span>
                  )}
                  {note && <span className="text-caption text-ink-muted">{note}</span>}
                </span>
                <span className="shrink-0 rounded-pill bg-surface-page px-2.5 py-1 text-caption font-semibold text-ink-muted">
                  {TAGS[quest.visibility]}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
    </Sheet>
  );
}
