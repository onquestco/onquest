import type { BlogCard } from '@/lib/blog/cards';

type Input = {
  /** get_profile.blogs: public posted blogs, in the cached page. */
  publicBlogs: BlogCard[];
  /** Your own blogs from /api/me/blogs once they arrive (own profile only), else null. */
  ownBlogs: BlogCard[] | null;
  isSelf: boolean;
  canWriteBlogs: boolean;
};

/**
 * What the profile shows under the counts (blogs spec §6.3, PRD B6):
 * - someone else's profile (or before the page knows who is looking): the Quests · Blogs switch
 *   only with at least one public blog, so a profile without blogs looks exactly as before;
 * - your own: the switch when you can write a blog or have any blog, and your whole list (drafts,
 *   unlisted and private ones with tags) once it has loaded.
 */
export function profileBlogs({ publicBlogs, ownBlogs, isSelf, canWriteBlogs }: Input) {
  const own = isSelf && ownBlogs !== null;
  const blogs = own ? ownBlogs : publicBlogs;
  const showSwitch = blogs.length > 0 || (isSelf && canWriteBlogs);
  return { showSwitch, blogs, own, showEmpty: blogs.length === 0 && isSelf && canWriteBlogs };
}
