// Product limits for a blog (founder, 23 Nov). The stored limits in schema.ts and migration 16
// equal these; they may widen, never narrow (old rows must keep parsing).

export const BLOG_TITLE_MAX = 100; // code points
export const BLOG_TITLE_COUNTER_FROM = 80;
export const BLOG_BODY_MAX = 10_000; // code points
export const BLOG_MAX_PHOTOS = 10;
/** "4 min read" = max(1, round(words / 200)). */
export const WORDS_PER_MINUTE = 200;
/** Thinner public blogs stay out of search (docs/03 §C.1). */
export const BLOG_MIN_WORDS_TO_INDEX = 80;
