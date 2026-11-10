import {
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
};

/**
 * Every cached page a deleted person appeared on (spec C §3.9 step 5): other people's Quests they
 * reacted to, the profiles on both sides of their follows, their own pages under every handle
 * they ever had, Explore and guides.
 */
export function tagsToRefresh(userKey: string, result: DeletionResult): string[] {
  const tags = [
    ...result.liked_or_commented_trip_keys.map(tripSocialTag),
    ...result.follow_profile_keys.map(profileTag),
    profileTag(userKey),
    ...result.handles.map(profileUrlTag),
    ...result.handles.flatMap((handle) => result.own_trips.map((trip) => tripUrlTag(handle, trip.slug))),
    ...result.own_trips.map((trip) => tripSocialTag(trip.key)),
    EXPLORE_TAG,
    GUIDE_QUESTS_TAG,
  ];
  return [...new Set(tags)];
}
