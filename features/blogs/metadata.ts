import type { Metadata } from 'next';
import { BLOG_MIN_WORDS_TO_INDEX } from '@/lib/blog/limits';
import type { BlogData } from '@/lib/blog/schema';
import { SITE_NAME } from '@/lib/site';
import type { BlogStatus } from './getBlogStatus';

/** Up to `max` characters (code points, so an emoji is never cut in half), with "…" when cut. */
function trim(text: string, max: number): string {
  const characters = [...text];
  return characters.length <= max ? text : `${characters.slice(0, max - 1).join('').trimEnd()}…`;
}

/** The first 155 characters of the text, whitespace collapsed; without text, who wrote it and where. */
export function blogDescription(blog: BlogData): string {
  const text = blog.paragraphs.flat().join(' ').replace(/\s+/g, ' ').trim();
  if (text) return trim(text, 155);
  return [`A blog by @${blog.writer.handle}`, blog.placeName].filter(Boolean).join(' · ');
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
