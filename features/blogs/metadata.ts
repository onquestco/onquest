import type { Metadata } from 'next';
import { BLOG_MIN_WORDS_TO_INDEX } from '@/lib/blog/limits';
import type { BlogBlock, BlogInline } from '@/lib/blog/markdown';
import type { BlogData } from '@/lib/blog/schema';
import { SITE_NAME } from '@/lib/site';
import type { BlogStatus } from './getBlogStatus';

/** Up to `max` characters (code points, so an emoji is never cut in half), with "…" when cut. */
function trim(text: string, max: number): string {
  const characters = [...text];
  return characters.length <= max ? text : `${characters.slice(0, max - 1).join('').trimEnd()}…`;
}

/**
 * The first 155 characters of the text as plain text (no markers, spoilers hidden), whitespace
 * collapsed; without text, who wrote it and where.
 */
export function blogDescription(blog: BlogData): string {
  const text = blocksPlainText(blog.blocks);
  if (text) return trim(text, 155);
  return [`A blog by @${blog.writer.handle}`, blog.placeName].filter(Boolean).join(' · ');
}

/**
 * The parsed body as one line of plain text, as blogPlainText() reads a body: markers gone,
 * spoilers "(spoiler)". The blocks are the whole body, never a cut excerpt, so a `>!` that never
 * closed is literal text here, as it is on the page (blogPlainText's `cut` is for excerpts).
 */
function blocksPlainText(blocks: BlogBlock[]): string {
  const out: string[] = [];
  const visit = (nodes: BlogInline[]) => {
    for (const node of nodes) {
      if (node.kind === 'text' || node.kind === 'code') out.push(node.text);
      else if (node.kind === 'spoiler') out.push(' (spoiler) ');
      else visit(node.children);
    }
  };
  for (const block of blocks) {
    const lines = block.kind === 'heading' ? [block.line] : block.kind === 'list' ? block.items : block.lines;
    for (const line of lines) {
      visit(line);
      out.push(' ');
    }
  }
  return out.join('').replace(/\s+/g, ' ').trim();
}

/**
 * A posted blog's page (spec §3.7). Indexed only when public with at least 80 words (title and
 * text); unlisted blogs are never indexed or followed.
 */
export function blogMetadata(blog: BlogData): Metadata {
  const index = !blog.unlisted && blog.wordCount >= BLOG_MIN_WORDS_TO_INDEX;
  const description = blogDescription(blog);

  return {
    title: `${trim(`${blog.title} by ${blog.writer.name}`, 60)} | ${SITE_NAME}`,
    description,
    alternates: { canonical: blog.url },
    robots: index ? { index: true, follow: true } : { index: false, follow: !blog.unlisted },
    authors: [{ name: blog.writer.name, url: blog.writer.profileUrl }],
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      title: blog.title,
      description,
      url: blog.url,
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      authors: [blog.writer.profileUrl],
    },
    twitter: { card: 'summary_large_image', title: blog.title, description },
  };
}

/** "This blog is private." / "This blog was removed.": never indexed, nothing previewed. */
export function unavailableBlogMetadata(reason: BlogStatus): Metadata {
  return {
    title: `${reason === 'private' ? 'This blog is private' : 'This blog was removed'} | ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}
