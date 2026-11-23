import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { BlogRowsSchema } from '@/lib/blog/schema';
import { toBlogData } from '@/lib/blog/toBlogData';
import { blogUrlTag } from '@/lib/cacheTags';
import { HANDLE_PATTERN } from '@/lib/handles';
import { createPublicSupabase } from '@/lib/supabase/public';

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function fetchBlogRows(handle: string, slug: string) {
  const { data, error } = await createPublicSupabase().rpc('get_blog', { p_handle: handle, p_slug: slug });
  // Throwing keeps a database hiccup out of the cache, where it would look like a missing blog.
  if (error) throw new Error('Could not load blog');
  return data === null ? null : BlogRowsSchema.parse(data);
}

/** A posted public or unlisted blog, or null. Cached until the blog's URL tag is refreshed. */
export const getBlog = cache(async (rawHandle: string, rawSlug: string) => {
  const handle = rawHandle.toLowerCase();
  const slug = rawSlug.toLowerCase();
  // Stops junk URLs from filling the cache or reaching the database.
  if (!HANDLE_PATTERN.test(handle) || !SLUG_PATTERN.test(slug)) return null;

  const rows = await unstable_cache(() => fetchBlogRows(handle, slug), ['blog', handle, slug], {
    tags: [blogUrlTag(handle, slug)],
  })();
  if (!rows) return null;

  return {
    blog: toBlogData(rows),
    /** `{owner}/{blog}` in storage, for the link preview's export-size cover. */
    photoFolder: rows.photo_folder,
    /** The writer's profile key (public, like get_profile's), for Follow and the linked-Quest tag. */
    ownerKey: rows.owner.key,
  };
});
