import Link from 'next/link';
import { HeartIcon } from '@/design-system/components/icons';
import type { QuestCard } from '@/lib/trip/cards';

/**
 * Two columns of Quests: trending (with like counts, screen 13) and search results. The title and
 * maker sit on the cover, like the cards everywhere else in the app.
 */
export function QuestGrid({ quests, showLikes = false }: { quests: QuestCard[]; showLikes?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {quests.map((quest) => (
        <li key={quest.key}>
          <Link
            href={quest.path ?? '#'}
            className="relative block aspect-4/5 overflow-hidden rounded-lg bg-night-band"
          >
            {quest.coverThumb && <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-linear-to-t from-night-band via-transparent to-transparent" />
            {showLikes && (
              <span className="absolute top-2 left-2 flex items-center gap-1 rounded-pill bg-surface px-2 text-caption font-semibold text-ink">
                <span className="text-brand-strong">
                  <HeartIcon size={12} filled />
                </span>
                {quest.likeCount}
              </span>
            )}
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
