import { absoluteUrl } from '@/lib/site';
import { photoUrls } from '@/lib/storage';
import { WORDS_PER_MINUTE } from './limits';
import { parseBlogBody } from './markdown';
import type { BlogData, BlogRows } from './schema';

/** "max(1, round(words / 200))": a blog never reads in 0 minutes. */
export function readMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/** Paragraphs split on blank lines, then lines on \n. Empty lines are dropped. */
export function toParagraphs(body: string): string[][] {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split('\n').filter((line) => line.trim() !== ''))
    .filter((lines) => lines.length > 0);
}

/** Turns get_blog's rows into what the blog page renders. The only place blog defaults apply. */
export function toBlogData(rows: BlogRows): BlogData {
  const { blog, owner } = rows;
  const path = `/@${owner.handle}/blog/${blog.slug}`;
  return {
    key: blog.key,
    url: absoluteUrl(path),
    path,
    unlisted: blog.visibility === 'unlisted',
    title: blog.title,
    paragraphs: toParagraphs(blog.body),
    blocks: parseBlogBody(blog.body),
    photos: blog.photos.map((photo) => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      ...photoUrls(rows.photo_folder, photo.id),
    })),
    ...(blog.place ? { placeName: blog.place.name } : {}),
    commentsOn: blog.comments_on,
    readMinutes: readMinutes(blog.word_count),
    wordCount: blog.word_count,
    publishedAt: blog.published_at,
    updatedAt: blog.saved_at,
    writer: {
      key: owner.key,
      handle: owner.handle,
      name: owner.name || owner.handle,
      ...(owner.avatar_url ? { avatarUrl: owner.avatar_url } : {}),
      profileUrl: absoluteUrl(`/@${owner.handle}`),
    },
  };
}
