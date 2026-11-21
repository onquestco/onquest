import Link from 'next/link';
import type { QuestCard } from '@/lib/trip/cards';

/**
 * Two columns of Quests: trending and search results. The title and
 * maker sit on the cover, like the cards everywhere else in the app.
 */
export function QuestGrid({ quests }: { quests: QuestCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {quests.map((quest) => (
        <li key={quest.key}>
          <Link
            href={quest.path ?? '#'}
            className="relative block aspect-4/5 overflow-hidden rounded-lg bg-night-band"
          >
            {quest.coverThumb && <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-linear-to-t from-night-band via-transparent to-transparent" />
            <span className="absolute inset-x-3 bottom-3 flex flex-col text-on-night">
              <span className="line-clamp-2 text-body font-bold">{quest.title}</span>
              <span className="truncate text-caption text-on-night-muted">@{quest.owner.handle}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
