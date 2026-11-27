import type { EventName } from './taxonomyV2';

// The 14 live v1 events and what each becomes in v2 (docs/specs/analytics-v2.md §5.3). The same
// mapping is written in SQL for history in docs/analytics/bigquery/events_people_all.sql (read
// through events_clean), and renameMap.test.ts checks the view maps every v1 name. AN-02 uses it
// to fill v2 properties from the values the call sites already have.

type V1Value = string | number | boolean | null | undefined;
export type V1Properties = Record<string, V1Value>;
export type RenamedEvent = { name: EventName; properties: Record<string, V1Value> };

const QUEST_OR_BLOG = { quest: 0, blog: 1 } as const;
const VISIBILITY = { public: 0, unlisted: 1, private: 2 } as const;
const REFERRER = { none: 0, whatsapp: 1, instagram: 2, other: 3 } as const;
const LIKE_SOURCE = { blog_page: 0, feed: 2, after_sign_in: 3 } as const;
const LEGAL_PAGE = { privacy: 0, terms: 1 } as const;
const LEGAL_SOURCE = { sign_in: 0, settings: 1, footer: 2, direct: 3 } as const;
const BLOG_START_SOURCE = { create: 0, write_your_own: 1 } as const;
const QUEST_LINK_ACTION = { link: 3, remove: 7 } as const;
const BLOG = 1; // content_type

/** The v2 code for a v1 string value; undefined when it isn't one (the property is left out). */
function code(codes: Record<string, number>, value: V1Value): number | undefined {
  return typeof value === 'string' && Object.hasOwn(codes, value) ? codes[value] : undefined;
}

function onOff(value: V1Value): boolean | undefined {
  if (value === 'on') return true;
  if (value === 'off') return false;
  return undefined;
}

function blogManaged(properties: V1Properties): RenamedEvent | null {
  const content = { content_type: BLOG, content_id: properties.blog_id };
  switch (properties.action) {
    case 'visibility':
      return {
        name: 'visibility_changed',
        properties: { ...content, to_visibility: code(VISIBILITY, properties.value) },
      };
    case 'comments':
      return { name: 'comments_toggled', properties: { ...content, comments_on_flg: onOff(properties.value) } };
    case 'delete':
      return { name: 'content_deleted', properties: { ...content, was_published_flg: true } };
    case 'edit':
      return { name: 'blog_updated', properties: { blog_id: properties.blog_id } };
    default:
      return null;
  }
}

export const V1_RENAMES: Record<string, (properties: V1Properties) => RenamedEvent | null> = {
  create_option_tapped: (properties) => ({
    name: 'create_option_click',
    properties: { option: code(QUEST_OR_BLOG, properties.option), available_flg: properties.available },
  }),
  blog_managed: blogManaged,
  blog_deleted: (properties) => ({
    name: 'content_deleted',
    properties: {
      content_type: BLOG,
      content_id: properties.blog_id,
      was_published_flg: false,
      photo_count: properties.photos,
    },
  }),
  blog_liked: (properties) => ({
    name: 'content_liked',
    properties: {
      content_type: BLOG,
      content_id: properties.blog_id,
      unlike_flg: properties.unlike,
      source: code(LIKE_SOURCE, properties.source),
    },
  }),
  blog_comment_posted: (properties) => ({
    name: 'comment_posted',
    properties: { content_type: BLOG, content_id: properties.blog_id, comment_length: properties.length },
  }),
  legal_page_viewed: (properties) => ({
    name: 'legal_page_viewed',
    properties: { page: code(LEGAL_PAGE, properties.page), source: code(LEGAL_SOURCE, properties.source) },
  }),
  blog_create_started: (properties) => ({
    name: 'blog_create_started',
    properties: { blog_id: properties.blog_id, click_loc: code(BLOG_START_SOURCE, properties.source) },
  }),
  blog_quest_linked: (properties) => ({
    name: 'blog_editor_action',
    properties: { blog_id: properties.blog_id, action: code(QUEST_LINK_ACTION, properties.action) },
  }),
  blog_previewed: (properties) => ({
    name: 'blog_editor_action',
    properties: { blog_id: properties.blog_id, action: 5 },
  }),
  blog_draft_saved: (properties) => ({
    name: 'blog_draft_saved',
    properties: {
      blog_id: properties.blog_id,
      chars_bucket: properties.chars_bucket,
      photo_count: properties.photos,
    },
  }),
  blog_published: (properties) => ({
    name: 'blog_published',
    properties: {
      blog_id: properties.blog_id,
      visibility: code(VISIBILITY, properties.visibility),
      photo_count: properties.photos,
      chars_bucket: properties.chars_bucket,
      has_quest_flg: properties.has_quest,
      has_place_flg: properties.has_place,
      minutes_since_start: properties.minutes_since_start,
    },
  }),
  blog_viewed: (properties) => ({
    name: 'blog_viewed',
    properties: {
      blog_id: properties.blog_id,
      view_id: properties.view_id,
      signed_in_flg: properties.signed_in,
      referrer: code(REFERRER, properties.referrer),
      has_quest_flg: properties.has_quest,
    },
  }),
  blog_quest_opened: (properties) => ({
    name: 'blog_quest_click',
    properties: { blog_id: properties.blog_id, view_id: properties.view_id },
  }),
  blog_read_end: (properties) => ({
    name: 'blog_read_end',
    properties: { blog_id: properties.blog_id, view_id: properties.view_id, seconds: properties.seconds },
  }),
};

/** A v1 event in v2 terms, or null if the name was never live (or blog_managed's action is unknown). */
export function renameV1Event(name: string, properties: V1Properties): RenamedEvent | null {
  return Object.hasOwn(V1_RENAMES, name) ? (V1_RENAMES[name]?.(properties) ?? null) : null;
}
