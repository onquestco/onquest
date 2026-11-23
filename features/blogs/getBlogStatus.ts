import { unstable_cache } from 'next/cache';
import { blogUrlTag } from '@/lib/cacheTags';
import { HANDLE_PATTERN } from '@/lib/handles';
import { createPublicSupabase } from '@/lib/supabase/public';
import { SLUG_PATTERN } from './getBlog';

export type BlogStatus = 'private' | 'removed';

/**
 * Why a blog link shows nothing: private, removed, or null (a real 404). Cached with the page
 * under the URL's tag, which Post, visibility changes and delete all refresh.
 */
export async function getBlogStatus(rawHandle: string, rawSlug: string): Promise<BlogStatus | null> {
  const handle = rawHandle.toLowerCase();
  const slug = rawSlug.toLowerCase();
  if (!HANDLE_PATTERN.test(handle) || !SLUG_PATTERN.test(slug)) return null;
  return unstable_cache(
    async () => {
      const { data, error } = await createPublicSupabase().rpc('get_blog_status', {
        p_handle: handle,
        p_slug: slug,
      });
      if (error) throw new Error('Could not load blog status');
      return data === 'private' || data === 'removed' ? (data as BlogStatus) : null;
    },
    ['blog-status', handle, slug],
    { tags: [blogUrlTag(handle, slug)] },
  )();
}
