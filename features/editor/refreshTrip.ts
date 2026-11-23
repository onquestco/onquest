import { updateTag } from 'next/cache';
import {
  blogQuestsTag,
  EXPLORE_TAG,
  GUIDE_QUESTS_TAG,
  profileTag,
  tripSocialTag,
  tripUrlTag,
} from '@/lib/cacheTags';

type Pages = {
  ownerKey: string;
  tripKey: string;
  /** Every handle the Quest's URL can be under (old handles redirect, so their cache clears too). */
  handles: string[];
  slugs: string[];
};

/**
 * Clears every cached page that shows this Quest, at each URL it has had (CLAUDE.md data rules),
 * including the "From this trip" card on the owner's blogs (blogs spec B9).
 */
export function refreshQuestPages({ ownerKey, tripKey, handles, slugs }: Pages) {
  for (const handle of new Set(handles)) {
    for (const slug of new Set(slugs)) updateTag(tripUrlTag(handle, slug));
  }
  updateTag(profileTag(ownerKey));
  updateTag(tripSocialTag(tripKey));
  updateTag(EXPLORE_TAG);
  updateTag(GUIDE_QUESTS_TAG);
  updateTag(blogQuestsTag(ownerKey));
}

/** Likes and comments only: comments switched on or off. */
export function refreshQuestSocial(tripKey: string) {
  updateTag(tripSocialTag(tripKey));
}
