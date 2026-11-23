import { randomToken, slugify } from '@/lib/slug';
import type { Visibility } from '@/lib/trip/schema';

const NO_RESERVED_SLUGS: ReadonlySet<string> = new Set();

/**
 * The slug asked for on a blog's first Post (spec §3.3): the title, or "blog" when nothing is
 * left of it (non-Latin titles). Unlisted gets the same random suffix as unlisted Quests, so the
 * link can't be guessed. publish_blog ignores it after the first Post (the link never changes),
 * and adds -2, -3 if the writer already has the slug or once deleted a blog at it.
 */
export function firstBlogSlug(title: string, visibility: Visibility): string {
  // Nothing is reserved under /@h/blog/, so "Blog" or "Followers" keep their plain link (review S2).
  const base = slugify(title, 70, 'blog', NO_RESERVED_SLUGS);
  return visibility === 'unlisted' ? `${base}-${randomToken()}` : base;
}
