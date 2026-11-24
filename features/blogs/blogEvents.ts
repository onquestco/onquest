import type { BlogDocument } from '@/lib/blog/schema';
import type { Visibility } from '@/lib/trip/schema';

// Properties of the blog server events (blogs spec §10). Never the title, body, place or a URL:
// only sizes, counts and choices.

type CharsBucket = '0' | '1-500' | '501-2000' | '2001-5000' | '5001-10000';

/** How long the body is, in code points (as the limits count them), as a band. */
export function charsBucket(body: string): CharsBucket {
  const length = [...body].length;
  if (length === 0) return '0';
  if (length <= 500) return '1-500';
  if (length <= 2000) return '501-2000';
  if (length <= 5000) return '2001-5000';
  return '5001-10000';
}

/** blog_draft_saved */
export function draftSavedProperties(blogKey: string, document: BlogDocument) {
  return { blog_id: blogKey, chars_bucket: charsBucket(document.body), photos: document.photos.length };
}

/** blog_published, on the first Post. minutes_since_start is left out when the draft has no start. */
export function publishedProperties(blogKey: string, document: BlogDocument, visibility: Visibility, now: Date) {
  const started = document.startedAt ? new Date(document.startedAt).getTime() : Number.NaN;
  const minutes = Number.isNaN(started)
    ? undefined
    : Math.round((Math.max(0, now.getTime() - started) / 60_000) * 10) / 10;
  return {
    blog_id: blogKey,
    visibility,
    photos: document.photos.length,
    chars_bucket: charsBucket(document.body),
    has_quest: document.linkedQuestKey !== undefined,
    has_place: document.place !== undefined,
    minutes_since_start: minutes,
  };
}

type Managed =
  | { action: 'edit' | 'delete' }
  | { action: 'visibility'; visibility: Visibility }
  | { action: 'comments'; on: boolean };

/** blog_managed: a change from the ⋯ menu (`edit` = an update posted by publishBlog). */
export function managedProperties(blogKey: string, change: Managed) {
  const value =
    change.action === 'visibility' ? change.visibility : change.action === 'comments' ? (change.on ? 'on' : 'off') : 'none';
  return { blog_id: blogKey, action: change.action, value };
}
