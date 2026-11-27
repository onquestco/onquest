import { blogBlocksPlainText, parseBlogBody, type BlogBlock } from './markdown';

// Card excerpts (profile Blogs tab, Quests tab, Home feed, Explore, search). The database's
// excerpt (blog_card_json, list_my_blogs) joins the body's lines before cutting it, so a "## " or
// "- " that started a line is mid-text there and can't be told from typed text. Loaders that can
// read the body build the excerpt here instead, from the parsed body.

/** As long as the database's excerpt (code points, so an emoji is never cut in half). */
export const BLOG_EXCERPT_LENGTH = 150;

/** Plain text cut to the excerpt length. */
export function cutExcerpt(plainText: string): string {
  const characters = [...plainText];
  if (characters.length <= BLOG_EXCERPT_LENGTH) return plainText;
  return characters.slice(0, BLOG_EXCERPT_LENGTH).join('').trimEnd();
}

/** A card excerpt from a whole body: "Text\n## Text\nHello im alok" → "Text Text Hello im alok". */
export function blogExcerpt(body: string): string {
  return cutExcerpt(blogBlocksPlainText(parseBlogBody(body)));
}

/** The same, from a body that is already parsed (getBlog's blocks). */
export function blogExcerptFromBlocks(blocks: BlogBlock[]): string {
  return cutExcerpt(blogBlocksPlainText(blocks));
}
