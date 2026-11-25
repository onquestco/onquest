import { hasBlogAccess } from '@/features/blog-editor/hasBlogAccess';
import { getMyBlogs } from '@/features/blogs/getMyBlogs';
import type { BlogCard } from '@/lib/blog/cards';

/**
 * The Quests tab's Blogs (blogs spec §6.3): every blog you've started, drafts included, and
 * whether you may write one. Blogs are extra: if they can't load, the tab works as before.
 */
export async function getYourBlogs(): Promise<{ blogs: BlogCard[]; canWriteBlogs: boolean }> {
  const [blogs, canWriteBlogs] = await Promise.all([getMyBlogs().catch(() => []), hasBlogAccess()]);
  return { blogs, canWriteBlogs };
}
