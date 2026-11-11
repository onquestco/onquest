import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

// A Quest as a full-width card in a feed (screen 12): who made it with places and when, the cover
// with the title and "2 pages · 6 photos" over it, then the actions (like, comments, share) that
// the screen passes in.

type Props = {
  href: string;
  title: string;
  coverUrl?: string;
  places: string[];
  owner?: { name: string; avatarUrl?: string; href: string };
  /** "3h", "2d": how long ago it was published. */
  when?: string;
  /** "2 pages · 6 photos". */
  meta?: string;
  actions?: ReactNode;
};

export function QuestCardView({ href, title, coverUrl, places, owner, when, meta, actions }: Props) {
  const subtitle = [places.slice(0, 2).join(', '), when].filter(Boolean).join(' · ');
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      {owner && (
        <Link href={owner.href} className="flex min-h-11 items-center gap-3 px-3 py-3">
          <Avatar name={owner.name} src={owner.avatarUrl} size={36} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-label font-semibold text-ink">{owner.name}</span>
            {subtitle && <span className="truncate text-caption text-ink-muted">{subtitle}</span>}
          </span>
        </Link>
      )}
      <Link href={href} className="relative block aspect-4/3 bg-surface-page">
        {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-linear-to-t from-night-band/80 via-transparent to-transparent" />
        <span className="absolute inset-x-3 bottom-3 flex flex-col text-on-night">
          <span className="text-lead font-semibold">{title}</span>
          {meta && <span className="text-caption text-on-night-muted">{meta}</span>}
        </span>
      </Link>
      {!owner && places.length > 0 && (
        <p className="px-3 pt-2 text-label font-normal text-ink-muted">{places.join(' · ')}</p>
      )}
      {actions && <div className="flex items-center gap-1 px-2 py-1">{actions}</div>}
    </article>
  );
}

/** "2 pages · 6 photos". */
export function questCardMeta(pageCount: number, photoCount: number): string {
  return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} · ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`;
}
