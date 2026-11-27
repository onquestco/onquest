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
