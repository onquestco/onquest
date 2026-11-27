import type { BlogCreateSource } from '@/features/shell/CreateChooser';
import {
  BLOG_CLICK_LOC_CODE,
  BLOG_EDITOR_ACTION_CODE,
  BLOG_LIKE_SOURCE_CODE,
  CONTENT_TYPE_CODE,
  VISIBILITY_CODE,
} from '@/lib/analytics/codes';
import type { BlogDocument } from '@/lib/blog/schema';
import type { Visibility } from '@/lib/trip/schema';

// Properties of the blog events (analytics v2, docs/analytics/v2/events.csv). Never the title,
// body, place or a URL: only sizes, counts, codes and keys. Properties a later task fills (spec
// §4.1 temporary overrides) are left out here, never guessed.

type CharsBucket = '0' | '1-500' | '501-2000' | '2001-5000' | '5001-10000';

const BLOG = CONTENT_TYPE_CODE.blog;

/** How long the body is, in code points (as the limits count them), as a band. */
export function charsBucket(body: string): CharsBucket {
  const length = [...body].length;
  if (length === 0) return '0';
  if (length <= 500) return '1-500';
  if (length <= 2000) return '501-2000';
  if (length <= 5000) return '2001-5000';
  return '5001-10000';
}

/** blog_create_started: the composer opened on a new blog. */
export function createStartedProperties(blogKey: string, source: BlogCreateSource) {
  return { blog_id: blogKey, click_loc: BLOG_CLICK_LOC_CODE[source] };
}

/** blog_editor_action: Link a Quest, Remove linked Quest, Preview (AN-13 sends the others). */
export function editorActionProperties(blogKey: string, action: 'link_quest' | 'remove_quest' | 'preview') {
  return { blog_id: blogKey, action: BLOG_EDITOR_ACTION_CODE[action] };
}

/** blog_draft_saved */
export function draftSavedProperties(blogKey: string, document: BlogDocument) {
  return { blog_id: blogKey, chars_bucket: charsBucket(document.body), photo_count: document.photos.length };
}

/**
 * blog_published, on the first Post. minutes_since_start is left out when the draft has no start
 * (drafts saved before startedAt existed): the event is still sent (spec §8).
 */
export function publishedProperties(blogKey: string, document: BlogDocument, visibility: Visibility, now: Date) {
  const started = document.startedAt ? new Date(document.startedAt).getTime() : Number.NaN;
  const minutes = Number.isNaN(started)
    ? undefined
    : Math.round((Math.max(0, now.getTime() - started) / 60_000) * 10) / 10;
  return {
    blog_id: blogKey,
    visibility: VISIBILITY_CODE[visibility],
    photo_count: document.photos.length,
    chars_bucket: charsBucket(document.body),
    has_quest_flg: document.linkedQuestKey !== undefined,
    has_place_flg: document.place !== undefined,
    minutes_since_start: minutes,
  };
}

/** blog_updated: a later Post of a blog that is already up. */
export function updatedProperties(blogKey: string) {
  return { blog_id: blogKey };
}

/** content_deleted for "Delete draft" on a blog that was never posted (blogs-editor spec §10). */
export function draftDeletedProperties(blogKey: string, document: BlogDocument) {
  return {
    content_type: BLOG,
    content_id: blogKey,
    was_published_flg: false,
    photo_count: document.photos.length,
  };
}

/** content_deleted for a posted blog (its counts are AN-09's). */
export function postedDeletedProperties(blogKey: string) {
  return { content_type: BLOG, content_id: blogKey, was_published_flg: true };
}

/** visibility_changed from the ⋯ menu. */
export function visibilityChangedProperties(blogKey: string, visibility: Visibility) {
  return { content_type: BLOG, content_id: blogKey, to_visibility: VISIBILITY_CODE[visibility] };
}

/** comments_toggled from the ⋯ menu. */
export function commentsToggledProperties(blogKey: string, on: boolean) {
  return { content_type: BLOG, content_id: blogKey, comments_on_flg: on };
}

/** content_liked: a like or unlike, with the count set_blog_like returned. */
export function likedProperties(
  blogKey: string,
  liked: boolean,
  source: keyof typeof BLOG_LIKE_SOURCE_CODE,
  likeCountAfter: number,
) {
  return {
    content_type: BLOG,
    content_id: blogKey,
    unlike_flg: !liked,
    source: BLOG_LIKE_SOURCE_CODE[source],
    like_count_after: likeCountAfter,
  };
}

/** comment_posted: the length in code points, never the text. */
export function commentPostedProperties(blogKey: string, body: string) {
  return { content_type: BLOG, content_id: blogKey, comment_length: [...body].length };
}
