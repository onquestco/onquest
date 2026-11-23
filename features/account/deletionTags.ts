import {
  blogQuestsTag,
  blogSocialTag,
  blogUrlTag,
  EXPLORE_TAG,
  GUIDE_QUESTS_TAG,
  profileTag,
  profileUrlTag,
  tripSocialTag,
  tripUrlTag,
} from '@/lib/cacheTags';

export type DeletionResult = {
  liked_or_commented_trip_keys: string[];
  follow_profile_keys: string[];
  own_trips: { key: string; slug: string }[];
  handles: string[];
  /** Blogs (migration 16). Absent from an older delete_account_data, so optional. */
  own_blogs?: { key: string; slug: string }[];
  /** Blogs they liked or commented on (migration 17). */
  liked_or_commented_blog_keys?: string[];
};

/**
 * Every cached page a deleted person appeared on (spec C §3.9 step 5): other people's Quests and
 * blogs they reacted to, the profiles on both sides of their follows, their own Quests and blogs
 * under every handle they ever had, Explore and guides.
 */
export function tagsToRefresh(userKey: string, result: DeletionResult): string[] {
  const ownBlogs = result.own_blogs ?? [];
  const tags = [
    ...result.liked_or_commented_trip_keys.map(tripSocialTag),
    ...result.follow_profile_keys.map(profileTag),
    profileTag(userKey),
    ...result.handles.map(profileUrlTag),
    ...result.handles.flatMap((handle) => result.own_trips.map((trip) => tripUrlTag(handle, trip.slug))),
    ...result.own_trips.map((trip) => tripSocialTag(trip.key)),
    ...result.handles.flatMap((handle) => ownBlogs.map((blog) => blogUrlTag(handle, blog.slug))),
    ...ownBlogs.map((blog) => blogSocialTag(blog.key)),
    ...(result.liked_or_commented_blog_keys ?? []).map(blogSocialTag),
    blogQuestsTag(userKey),
    EXPLORE_TAG,
    GUIDE_QUESTS_TAG,
  ];
  return [...new Set(tags)];
}
