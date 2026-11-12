import Link from 'next/link';
import type { ReactNode } from 'react';
import { MoreIcon } from '@/design-system/components/icons';
import type { QuestCard } from '@/lib/trip/cards';
import { questTag } from './questFilters';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "Goa · Oct 2026" (Home) or "24 likes · 2 comments" (Your Quests); drafts say "Continue editing". */
export function tileMeta(quest: QuestCard, kind: 'place' | 'counts'): string {
  if (quest.status === 'draft') return 'Continue editing';
  if (kind === 'counts')
    return `${plural(quest.likeCount, 'like')} · ${plural(quest.commentCount, 'comment')}`;
  const when = quest.publishedAt
    ? `${MONTHS[Number(quest.publishedAt.slice(5, 7)) - 1]} ${quest.publishedAt.slice(0, 4)}`
    : undefined;
  return [quest.places[0], when].filter(Boolean).join(' · ');
}

type Props = { quest: QuestCard; meta: ReactNode; onManage?: () => void };

/** The prototype's Quest tile (.qcard): cover, tag top-left, ⋯ top-right, title and meta on the photo. */
export function QuestTile({ quest, meta, onManage }: Props) {
  const draft = quest.status === 'draft';
  const tag = questTag(quest);
  return (
    <div className="relative">
      <Link
        href={draft ? `/quests/${quest.key}/review` : (quest.path ?? `/quests/${quest.key}/review`)}
        className="relative block aspect-4/5 overflow-hidden rounded-lg bg-night-band"
      >
        {quest.coverThumb && <img src={quest.coverThumb} alt="" className="h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-linear-to-t from-night-band via-transparent to-transparent" />
        <span className="absolute inset-x-3 bottom-3 flex flex-col gap-0.5 text-on-night">
          <span className="line-clamp-2 text-body font-bold">{quest.title}</span>
          {meta && <span className="truncate text-caption text-on-night-muted">{meta}</span>}
        </span>
      </Link>
      {tag && (
        <span className="absolute top-2.5 left-2.5 rounded-pill bg-surface px-2 py-0.5 text-caption font-bold text-ink">
          {tag}
        </span>
      )}
      {!draft && onManage && (
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
    </div>
  );
}

/** The dashed "+ Create a Quest" tile that sits in the grid. */
export function CreateTile({ source }: { source: string }) {
  return (
    <Link
      href={`/quests/new?source=${source}`}
      className="flex aspect-4/5 items-center justify-center rounded-lg border-2 border-dashed border-line-control bg-surface text-body font-semibold text-brand-strong"
    >
      + Create a Quest
    </Link>
  );
}
