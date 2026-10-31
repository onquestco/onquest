/**
 * Tag on a trip page's cached data. It's keyed by URL, not trip id, because a missing trip has no
 * id: a cached 404 must also clear when that URL gets published.
 */
export const tripUrlTag = (handle: string, slug: string) => `trip-url:${handle}/${slug}`;
