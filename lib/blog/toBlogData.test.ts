import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlogRows } from './schema';
import { readMinutes, toBlogData, toParagraphs } from './toBlogData';

const OWNER = '00000000-0000-4000-8000-000000000001';
const BLOG = '00000000-0000-4000-8000-0000000000c1';
const PHOTO = '00000000-0000-4000-8000-0000000000b1';

const rows: BlogRows = {
  blog: {
    key: BLOG,
    slug: 'goa-on-15k',
    visibility: 'unlisted',
    title: 'Goa on 15k',
    body: 'First line\nsecond line\n\n\n  \nNext paragraph',
    photos: [{ id: PHOTO, width: 1600, height: 1200 }],
    place: { name: 'Goa' },
    comments_on: false,
    word_count: 450,
    published_at: '2026-11-24T10:00:00+00:00',
    saved_at: '2026-11-25T10:00:00+00:00',
  },
  owner: { key: OWNER, handle: 'riya', name: null, avatar_url: null },
  photo_folder: `${OWNER}/${BLOG}`,
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.test');
});

describe('toBlogData', () => {
  it('builds the page from the rows', () => {
    const data = toBlogData(rows);
    expect(data).toMatchObject({
      key: BLOG,
      path: '/@riya/blog/goa-on-15k',
      unlisted: true,
      title: 'Goa on 15k',
      paragraphs: [['First line', 'second line'], ['Next paragraph']],
      placeName: 'Goa',
      commentsOn: false,
      readMinutes: 2,
      wordCount: 450,
      publishedAt: rows.blog.published_at,
      updatedAt: rows.blog.saved_at,
    });
    expect(data.url).toMatch(/\/@riya\/blog\/goa-on-15k$/);
    expect(data.photos[0]).toMatchObject({
      id: PHOTO,
      width: 1600,
      height: 1200,
      thumb: `https://db.test/storage/v1/object/public/photos/${OWNER}/${BLOG}/${PHOTO}/thumb.webp`,
      display: `https://db.test/storage/v1/object/public/photos/${OWNER}/${BLOG}/${PHOTO}/display.webp`,
    });
  });

  it('falls back to the handle for the name and leaves out what is missing', () => {
    const data = toBlogData({
      ...rows,
      blog: { ...rows.blog, body: '', photos: [], place: null, word_count: 3 },
    });
    expect(data.writer).toEqual({
      key: OWNER,
      handle: 'riya',
      name: 'riya',
      profileUrl: expect.stringMatching(/\/@riya$/),
    });
    expect('placeName' in data).toBe(false);
    expect(data.paragraphs).toEqual([]);
    expect(data.photos).toEqual([]);
    expect(data.readMinutes).toBe(1);
  });
});

describe('readMinutes and toParagraphs', () => {
  it('never says 0 minutes and rounds to the nearest minute', () => {
    expect(readMinutes(0)).toBe(1);
    expect(readMinutes(299)).toBe(1);
    expect(readMinutes(300)).toBe(2);
    expect(readMinutes(800)).toBe(4);
  });

  it('treats Windows line endings like any other', () => {
    expect(toParagraphs('a\r\nb\r\n\r\nc')).toEqual([['a', 'b'], ['c']]);
  });
});
