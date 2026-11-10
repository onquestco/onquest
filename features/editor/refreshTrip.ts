import { updateTag } from 'next/cache';
import { EXPLORE_TAG, GUIDE_QUESTS_TAG, profileTag, tripSocialTag, tripUrlTag } from '@/lib/cacheTags';

type Pages = {
  ownerKey: string;
  tripKey: string;
  /** Every handle the Quest's URL can be under (old handles redirect, so their cache clears too). */
  handles: string[];
  slugs: string[];
};

/** Clears every cached page that shows this Quest, at each URL it has had (CLAUDE.md data rules). */
export function refreshQuestPages({ ownerKey, tripKey, handles, slugs }: Pages) {
  for (const handle of new Set(handles)) {
    for (const slug of new Set(slugs)) updateTag(tripUrlTag(handle, slug));
  }
  updateTag(profileTag(ownerKey));
  updateTag(tripSocialTag(tripKey));
  updateTag(EXPLORE_TAG);
  updateTag(GUIDE_QUESTS_TAG);
}

/** Likes and comments only: comments switched on or off. */
export function refreshQuestSocial(tripKey: string) {
  updateTag(tripSocialTag(tripKey));
}
