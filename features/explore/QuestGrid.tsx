import Link from 'next/link';
import type { QuestCard } from '@/lib/trip/cards';

/** Two columns of Quests: trending and search results. */
export function QuestGrid({ quests }: { quests: QuestCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4">
      {quests.map((quest) => (
        <li key={quest.key}>
          <Link href={quest.path ?? '#'} className="flex flex-col gap-1">
            <span className="block aspect-4/5 overflow-hidden rounded-lg bg-surface-page">
              {quest.coverThumb && (
                <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="truncate text-label font-semibold text-ink">{quest.title}</span>
            <span className="truncate text-caption text-ink-muted">@{quest.owner.handle}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
