import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

// A Quest as a card in a feed or grid: who made it, the cover, the title and places. Actions
// (like, comments, ⋯) are passed in by the screen.

type Props = {
  href: string;
  title: string;
  coverUrl?: string;
  places: string[];
  owner?: { name: string; avatarUrl?: string; href: string };
  actions?: ReactNode;
};

export function QuestCardView({ href, title, coverUrl, places, owner, actions }: Props) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      {owner && (
        <Link
          href={owner.href}
          className="flex min-h-11 items-center gap-2 text-label font-semibold text-ink"
        >
          <Avatar name={owner.name} src={owner.avatarUrl} size={32} />
          {owner.name}
        </Link>
      )}
      <Link href={href} className="flex flex-col gap-2">
        <span className="block aspect-4/3 overflow-hidden rounded-md bg-surface-page">
          {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
        </span>
        <span className="text-lead font-semibold text-ink">{title}</span>
        {places.length > 0 && (
          <span className="text-label font-normal text-ink-muted">{places.join(' · ')}</span>
        )}
      </Link>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </article>
  );
}
