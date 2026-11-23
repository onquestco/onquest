import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BlogDocumentSchema, BlogPlaceSchema, BlogRowsSchema } from './schema';
import { BLOG_BODY_MAX, BLOG_MAX_PHOTOS, BLOG_TITLE_MAX } from './limits';

const PHOTO = { id: '00000000-0000-4000-8000-0000000000b1', width: 1600, height: 1200 };

describe('BlogDocumentSchema', () => {
  it('parses the smallest stored document and fills the defaults', () => {
    expect(BlogDocumentSchema.parse({ body: '' })).toEqual({ body: '', photos: [] });
    expect(BlogDocumentSchema.parse({})).toEqual({ body: '', photos: [] });
  });

  it('keeps the limits the founder set', () => {
    expect(BlogDocumentSchema.safeParse({ title: 'a'.repeat(BLOG_TITLE_MAX) }).success).toBe(true);
    expect(BlogDocumentSchema.safeParse({ title: 'a'.repeat(BLOG_TITLE_MAX + 1) }).success).toBe(false);
    expect(BlogDocumentSchema.safeParse({ body: 'a'.repeat(BLOG_BODY_MAX + 1) }).success).toBe(false);
    const photos = (count: number) => Array.from({ length: count }, () => ({ ...PHOTO, id: randomUUID() }));
    expect(BlogDocumentSchema.safeParse({ photos: photos(BLOG_MAX_PHOTOS) }).success).toBe(true);
    expect(BlogDocumentSchema.safeParse({ photos: photos(BLOG_MAX_PHOTOS + 1) }).success).toBe(false);
  });

  it('counts an emoji as one character, like the database', () => {
    expect(BlogDocumentSchema.safeParse({ title: '🌴'.repeat(BLOG_TITLE_MAX) }).success).toBe(true);
    expect(BlogDocumentSchema.safeParse({ title: '🌴'.repeat(BLOG_TITLE_MAX + 1) }).success).toBe(false);
    expect(BlogDocumentSchema.safeParse({ body: '🏔️'.repeat(10) }).success).toBe(true);
  });

  it('never keeps coordinates, on a photo or a place', () => {
    const parsed = BlogDocumentSchema.parse({
      photos: [{ ...PHOTO, lat: 15.49, lng: 73.82, gps: { lat: 1, lng: 2 } }],
      place: { name: 'Goa', lat: 15.49, lng: 73.82 },
    });
    expect(JSON.stringify(parsed)).not.toMatch(/lat|lng|gps/);
    expect(Object.keys(BlogPlaceSchema.shape).sort()).toEqual(['city', 'countryCode', 'geoRef', 'name']);
  });

  it('wants a real place name', () => {
    expect(BlogPlaceSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(BlogPlaceSchema.safeParse({ name: 'Goa', countryCode: 'in' }).success).toBe(false);
  });
});

describe('BlogRowsSchema', () => {
  it('parses what get_blog returns', () => {
    const rows = {
      blog: {
        key: '00000000-0000-4000-8000-0000000000c1',
        slug: 'goa-on-15k',
        visibility: 'public',
        title: 'Goa on 15k',
        body: 'Hello',
        photos: [PHOTO],
        place: null,
        comments_on: true,
        word_count: 4,
        published_at: '2026-11-24T10:00:00+00:00',
        saved_at: '2026-11-24T10:00:00+00:00',
      },
      owner: { key: '00000000-0000-4000-8000-000000000001', handle: 'alex', name: null, avatar_url: null },
      photo_folder: '00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-0000000000c1',
    };
    expect(BlogRowsSchema.parse(rows)).toEqual(rows);
    expect(BlogRowsSchema.safeParse({ ...rows, blog: { ...rows.blog, visibility: 'private' } }).success).toBe(
      false,
    );
  });
});
