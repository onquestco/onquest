import { randomToken, slugify } from '@/lib/slug';
import type { Visibility } from '@/lib/trip/schema';

/**
 * The slug asked for on a blog's first Post (spec §3.3): the title, or "blog" when nothing is
 * left of it (non-Latin titles). Unlisted gets the same random suffix as unlisted Quests, so the
 * link can't be guessed. publish_blog ignores it after the first Post (the link never changes),
 * and adds -2, -3 if the writer already has the slug or once deleted a blog at it.
 */
export function firstBlogSlug(title: string, visibility: Visibility): string {
  const base = slugify(title, 70, 'blog');
  return visibility === 'unlisted' ? `${base}-${randomToken()}` : base;
}
