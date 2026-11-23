import { updateTag } from 'next/cache';
import { blogQuestsTag, blogSocialTag, blogUrlTag, EXPLORE_TAG, profileTag } from '@/lib/cacheTags';

type Pages = {
  ownerKey: string;
  blogKey: string;
  /** Every handle the blog's URL can be under (a delete leaves a tombstone under each). */
  handles: string[];
  /** Empty for a blog that was never posted. */
  slugs: string[];
};

/**
 * Clears every cached page that shows this blog (CLAUDE.md data rules): its URL under each
 * handle, the profile, its likes and comments, the linked-Quest card and Explore. Draft saves
 * never call this: readers only see a change when it's posted.
 */
export function refreshBlogPages({ ownerKey, blogKey, handles, slugs }: Pages) {
  for (const handle of new Set(handles)) {
    for (const slug of new Set(slugs)) updateTag(blogUrlTag(handle, slug));
  }
  updateTag(profileTag(ownerKey));
  updateTag(blogSocialTag(blogKey));
  updateTag(blogQuestsTag(ownerKey));
  updateTag(EXPLORE_TAG);
}

/** Likes and comments only: comments switched on or off. */
export function refreshBlogSocial(blogKey: string) {
  updateTag(blogSocialTag(blogKey));
}
