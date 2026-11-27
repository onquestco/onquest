// The app's own words for things (visibility, ?source= values, …) as the v2 codes the taxonomy
// sends (docs/analytics/v2/codes.csv). One section per task, append-only: a later task imports an
// earlier section and never edits it (docs/specs/analytics-v2.md §12.1). codes.test.ts checks every
// number against the sheet.

// AN-02 -----------------------------------------------------------------------------------------

/** content_type */
export const CONTENT_TYPE_CODE = { quest: 0, blog: 1, profile: 2, guide: 3 } as const;

/** visibility */
export const VISIBILITY_CODE = { public: 0, unlisted: 1, private: 2 } as const;

/** referrer (blog_viewed, quest_viewed), from blogReferrer() */
export const REFERRER_CODE = { none: 0, whatsapp: 1, instagram: 2, other: 3 } as const;

/** like source, for a blog like (BlogLikeSource). The Quest sources are AN-09's. */
export const BLOG_LIKE_SOURCE_CODE = { blog_page: 0, feed: 2, after_sign_in: 3 } as const;

/** create_option_click.option (events.csv): 2 = closed without choosing. */
export const CREATE_OPTION_CODE = { quest: 0, blog: 1, closed: 2 } as const;

/** blog click_loc (blog_create_started), from the composer's ?source= */
export const BLOG_CLICK_LOC_CODE = { create: 0, write_your_own: 1 } as const;

/** blog_editor_action. AN-02 sends link_quest, preview and remove_quest; AN-13 the rest. */
export const BLOG_EDITOR_ACTION_CODE = {
  add_photos: 0,
  remove_photo: 1,
  add_place: 2,
  link_quest: 3,
  create_quest: 4,
  preview: 5,
  close: 6,
  remove_quest: 7,
  reorder_photos: 8,
  remove_place: 9,
} as const;

/** legal page / source: legal_page_viewed.page */
export const LEGAL_PAGE_CODE = { privacy: 0, terms: 1 } as const;

/** legal page / source: legal_page_viewed.source, from ?from= (else direct) */
export const LEGAL_SOURCE_CODE = { sign_in: 0, settings: 1, footer: 2, direct: 3 } as const;

// AN-03 -----------------------------------------------------------------------------------------

/** platform (common.csv): pointer: coarse, or "Mobi" in the user agent, is mobile. */
export const PLATFORM_CODE = { mobile: 0, desktop: 1 } as const;

/** from_screen, by route (docs/specs/analytics-v2.md §6.1; screens.ts maps routes to these). */
export const FROM_SCREEN_CODE = {
  home: 0,
  explore: 1,
  quests_tab: 2,
  profile: 3,
  quest_page: 4,
  blog_page: 5,
  settings: 6,
  notifications: 7,
  create_flow: 8,
  other: 9,
  create_page: 10,
  blog_composer: 11,
  guide_page: 12,
  sign_in: 13,
  welcome: 14,
  legal: 15,
} as const;

/** app_opened.landing_page. events.csv allows 0–6 only; codes.csv's "7 = Other" isn't sent (§14). */
export const LANDING_PAGE_CODE = {
  home: 0,
  quest_page: 1,
  blog_page: 2,
  profile: 3,
  explore: 4,
  quests: 5,
  create: 6,
} as const;

/** app_opened.entry_type (3 is unused in the sheet). */
export const ENTRY_TYPE_CODE = { default: 0, shared_link: 1, email: 2, other: 4 } as const;

// AN-05 -----------------------------------------------------------------------------------------

/** template (quest_viewed; AN-07 imports it for template_select), by template id. */
export const TEMPLATE_CODE = {
  coastal: 0,
  alpine: 1,
  roadtrip: 2,
  winter: 3,
  monsoon: 4,
  desert: 5,
  beach: 6,
  mountain: 7,
} as const;

/** quest_viewed source: the ?src=<code> on in-app Quest links (withSrc in src.ts). */
export const QUEST_SOURCE_CODE = {
  shared_link: 0,
  home_feed: 1,
  suggested: 2,
  explore_trending: 3,
  search: 4,
  profile: 5,
  blog_or_guide: 6,
  notification: 7,
  quests_tab: 8,
  example: 9,
  your_quests_home: 10,
} as const;

/** unavailable reason (quest_unavailable; blog_unavailable in AN-13) */
export const UNAVAILABLE_REASON_CODE = { private: 0, removed: 1, not_found: 2 } as const;

/** quest_page_turn.direction (events.csv) */
export const PAGE_TURN_DIRECTION_CODE = { next: 0, previous: 1 } as const;

/** quest_page_turn.via (events.csv) */
export const PAGE_TURN_VIA_CODE = { tap: 0, swipe: 1, key: 2 } as const;

/** quest_fullscreen.via (events.csv) */
export const FULLSCREEN_VIA_CODE = { button: 0, escape: 1 } as const;

/** quest_photo_click.action (events.csv) */
export const QUEST_PHOTO_ACTION_CODE = { open: 0, next: 1, previous: 2, map: 3 } as const;

/** quest_view_ended.exit_type (events.csv) */
export const VIEW_EXIT_CODE = { back: 0, in_app: 1, hidden: 2, make_your_own: 3 } as const;

// AN-06 -----------------------------------------------------------------------------------------

/** click_loc (create_quest_click, quest_draft_created, quest_creation_complete). AN-07 imports it. */
export const QUEST_CLICK_LOC_CODE = {
  home_banner: 0,
  create_menu: 1,
  make_your_own: 2,
  make_your_own_unavailable: 3,
  your_quests_tile: 4,
  quests_tab_card: 5,
  empty_state: 6,
  welcome: 7,
  whats_a_quest: 8,
  blog_link_quest: 9,
  feed_explore: 10,
} as const;

/** quest_arranged.arrange_mode (events.csv) */
export const ARRANGE_MODE_CODE = {
  page_per_day: 0,
  chapters: 1,
  day_split_by_time: 2,
  pick_order: 3,
  mixed: 4,
} as const;

// AN-07 -----------------------------------------------------------------------------------------

/** quest_edit action */
export const QUEST_EDIT_ACTION_CODE = {
  title: 0,
  caption: 1,
  date: 2,
  place: 3,
  move_photo: 4,
  swap_photos: 5,
  new_page: 6,
  remove_photo: 7,
  replace_photo: 8,
  add_photos: 9,
  rename_page: 10,
  undo: 11,
} as const;

/** create step (quest_create_abandoned) */
export const CREATE_STEP_CODE = {
  pick: 0,
  arranging: 1,
  review: 2,
  template: 3,
  preview: 4,
  publish_sheet: 5,
} as const;

/** photo_limit_hit.limit (events.csv) */
export const PHOTO_LIMIT_CODE = { max: 0, min: 1 } as const;

/** photo_limit_hit.screen (events.csv) */
export const PHOTO_LIMIT_SCREEN_CODE = { pick: 0, review: 1 } as const;

/** preview_exit.action (events.csv) */
export const PREVIEW_EXIT_CODE = { back_to_edit: 0, publish: 1 } as const;

/** draft_resumed.source (events.csv) */
export const DRAFT_RESUMED_SOURCE_CODE = { home: 0, quests_tab: 1, manage_menu: 2 } as const;
