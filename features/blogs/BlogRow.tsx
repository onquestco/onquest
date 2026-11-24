import Link from 'next/link';
import { MoreIcon } from '@/design-system/components/icons';
import { questTag } from '@/features/quests/questFilters';
import type { BlogCard } from '@/lib/blog/cards';
import { LetterTile } from './LetterTile';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "4 min read · 2 likes" (the real count from the first like); a draft says "Continue editing". */
export function blogRowMeta(blog: Pick<BlogCard, 'status' | 'readMinutes' | 'likeCount'>): string {
  if (blog.status === 'draft') return 'Continue editing';
  const likes = blog.likeCount > 0 ? ` · ${plural(blog.likeCount, 'like')}` : '';
  return `${blog.readMinutes} min read${likes}`;
}

/**
 * Where a row opens. Your own draft opens the composer and your own private blog its owner view
 * (its public link only says "This blog is private."); everything else opens the blog's link.
 */
export function blogRowHref(blog: Pick<BlogCard, 'key' | 'status' | 'visibility' | 'path'>, own: boolean): string {
  if (blog.status === 'draft') return `/blogs/${blog.key}/edit`;
  if (own && (blog.visibility === 'private' || !blog.path)) return `/blogs/${blog.key}`;
  return blog.path ?? `/blogs/${blog.key}`;
}

type Props = { blog: BlogCard; own?: boolean; onManage?: () => void };

/**
 * One blog in a one-column list (PRD B6): cover thumbnail or a letter tile, title, the first line
 * of text, "4 min read" and likes. Your own rows carry the Draft / Unlisted / Private tag and ⋯.
 */
export function BlogRow({ blog, own = false, onManage }: Props) {
  const tag = own ? questTag(blog) : null;
  return (
    <div className="relative">
      <Link
        href={blogRowHref(blog, own)}
        className={`flex items-center gap-3 rounded-md border border-line bg-surface p-2 focus-visible:outline-2 focus-visible:outline-brand-strong ${onManage ? 'pr-12' : ''}`}
      >
        {blog.coverThumb ? (
          <img
            src={blog.coverThumb}
            alt=""
            width={76}
            height={76}
            loading="lazy"
            className="size-19 shrink-0 rounded-md bg-surface-page object-cover"
          />
        ) : (
          <LetterTile title={blog.title} />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {tag && (
            <span className="self-start rounded-pill bg-surface-page px-2 py-0.5 text-caption font-bold text-ink">
              {tag}
            </span>
          )}
          <span className="line-clamp-2 text-body font-semibold text-ink">{blog.title}</span>
          {blog.excerpt && <span className="truncate text-label font-normal text-ink-muted">{blog.excerpt}</span>}
          <span className="text-caption text-ink-muted">{blogRowMeta(blog)}</span>
        </span>
      </Link>
      {onManage && (
        <button
          type="button"
          aria-label={`Manage ${blog.title}`}
          onClick={onManage}
          className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-pill text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
        >
          <MoreIcon size={20} />
        </button>
      )}
    </div>
  );
}
