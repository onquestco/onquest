/**
 * Tag on a trip page's cached data. It's keyed by URL, not trip id, because a missing trip has no
 * id: a cached 404 must also clear when that URL gets published.
 */
export const tripUrlTag = (handle: string, slug: string) => `trip-url:${handle}/${slug}`;

/** A profile page and its Quest list. */
export const profileTag = (ownerKey: string) => `profile:${ownerKey}`;

/** A Quest's likes and comments, cached apart from the page so a like doesn't rebuild it (spec B). */
export const tripSocialTag = (tripKey: string) => `trip-social:${tripKey}`;

/** Explore's trending lists and the Quests shown on guide pages (spec C). */
export const EXPLORE_TAG = 'explore';
export const GUIDE_QUESTS_TAG = 'guide-quests';

/**
 * A profile page by URL. Like tripUrlTag: a cached "no such profile" must clear when someone takes
 * that handle, and an old handle's page must start redirecting when it's changed.
 */
export const profileUrlTag = (handle: string) => `profile-url:${handle}`;
