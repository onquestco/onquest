import { slugify, unlistedSlug } from '@/lib/slug';
import type { Visibility } from '@/lib/trip/schema';

/**
 * The slug asked for on a Quest's first publish (spec A §3.6). Unlisted gets a random suffix so
 * the URL can't be guessed. After the first publish the slug never changes, whatever the title
 * or visibility, so shared links keep working; publish_trip ignores this then, and adds -2, -3
 * if the owner already has the slug or once deleted a Quest at it.
 */
export function firstPublishSlug(title: string, visibility: Visibility): string {
  return visibility === 'unlisted' ? unlistedSlug(title) : slugify(title, 70);
}
