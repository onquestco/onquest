// Product limits for a Quest. Stored limits in schema.ts are wider and never narrowed, so old
// test trips still parse; these are enforced by the editor and the save actions.

export const MAX_PHOTOS = 15;
export const MIN_PHOTOS_TO_PUBLISH = 3;
export const MAX_PAGES = 5;
export const PHOTOS_PER_PAGE = 3;
/** Editor and caption-model limit. The stored limit stays 80. */
export const CAPTION_MAX = 60;
