'use client';

import { useRouter } from 'next/navigation';
import { BlogList } from '@/features/blogs/BlogList';
import { NoBlogsYet } from '@/features/blogs/NoBlogsYet';
import type { BlogCard } from '@/lib/blog/cards';

/**
 * The Quests tab's Blogs (PRD B5, B6): every blog you've started, newest save first. Drafts say
 * "Continue editing" and open the composer; posted ones have ⋯.
 */
export function YourBlogsList({ blogs, canWriteBlogs }: { blogs: BlogCard[]; canWriteBlogs: boolean }) {
  const router = useRouter();
  if (blogs.length === 0) return canWriteBlogs ? <NoBlogsYet /> : null;
  return (
    <>
      <BlogList blogs={blogs} own onReload={() => router.refresh()} />
      <p className="text-label font-normal text-ink-muted">
        Every blog you&apos;ve started, whoever can see it. Use ⋯ to edit, share, change who can see it, or delete.
      </p>
    </>
  );
}
