'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { BlogCardSchema, type BlogCard } from '@/lib/blog/cards';

const OwnBlogsSchema = z.array(BlogCardSchema);

/**
 * Your own blogs, drafts, unlisted and private ones included (GET /api/me/blogs, never cached),
 * for the Blogs list on your own cached profile. null until asked, or when it can't load: the
 * profile then keeps showing its public blogs.
 */
export function useOwnBlogs(enabled: boolean): { blogs: BlogCard[] | null; reload: () => void } {
  const [blogs, setBlogs] = useState<BlogCard[] | null>(null);
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch('/api/me/blogs', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const parsed = OwnBlogsSchema.safeParse(body);
        if (parsed.success) setBlogs(parsed.data);
      })
      .catch(() => {
        // Offline or failed: the public list stays on screen.
      });
    return () => controller.abort();
  }, [enabled, asked]);

  const reload = useCallback(() => setAsked((count) => count + 1), []);
  return { blogs, reload };
}
