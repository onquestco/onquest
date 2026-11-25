import Link from 'next/link';
import { LetterTile } from '@/features/blogs/LetterTile';
import type { BlogCard } from '@/lib/blog/cards';

/** "Blog · 4 min read · by @riya" (PRD B8, decided 23 Nov). */
export function blogStoryMeta(blog: Pick<BlogCard, 'readMinutes' | 'owner'>): string {
  return `Blog · ${blog.readMinutes} min read · by @${blog.owner.handle}`;
}

/**
 * Public blogs under "Stories and guides" on Explore and in search, after the OnQuest guides and
 * laid out like them (PRD B8, S3): cover or a letter tile, "Blog · 4 min read · by @username", title.
 */
export function BlogStoryRows({ blogs }: { blogs: BlogCard[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-label="Blogs">
      {blogs.map((blog) => (
        <li key={blog.key}>
          <Link
            href={blog.path ?? `/@${blog.owner.handle}`}
            className="flex items-center gap-3 rounded-md border border-line bg-surface p-2"
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
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-caption font-semibold text-brand-strong">{blogStoryMeta(blog)}</span>
              <span className="line-clamp-2 text-body font-semibold text-ink">{blog.title}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
