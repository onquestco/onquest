import { describe, expect, it } from 'vitest';
import { SERVER_EVENTS } from '@/lib/analytics/taxonomy';
import { propertyProblems } from '@/lib/analytics/validate';
import { BlogDocumentSchema } from '@/lib/blog/schema';
import { charsBucket, draftSavedProperties, managedProperties, publishedProperties } from './blogEvents';

// Each blog server event's properties must pass the taxonomy, or trackServer drops the event.

const KEY = '00000000-0000-4000-8000-0000000000c1';
const photo = { id: '00000000-0000-4000-8000-0000000000b1', width: 1600, height: 1200 };
const NOW = new Date('2026-11-24T10:30:00Z');

describe('charsBucket', () => {
  it('bands the length in code points', () => {
    expect(charsBucket('')).toBe('0');
    expect(charsBucket('x'.repeat(500))).toBe('1-500');
    expect(charsBucket('😀'.repeat(500))).toBe('1-500'); // 1,000 UTF-16 units, 500 characters
    expect(charsBucket('x'.repeat(501))).toBe('501-2000');
    expect(charsBucket('x'.repeat(5000))).toBe('2001-5000');
    expect(charsBucket('x'.repeat(10_000))).toBe('5001-10000');
  });
});

describe('blog_draft_saved', () => {
  it('carries the band and the photo count, valid for the taxonomy', () => {
    const properties = draftSavedProperties(KEY, BlogDocumentSchema.parse({ body: 'Hello', photos: [photo] }));
    expect(properties).toEqual({ blog_id: KEY, chars_bucket: '1-500', photos: 1 });
    expect(propertyProblems(SERVER_EVENTS.blog_draft_saved, properties)).toEqual([]);
  });
});

describe('blog_published', () => {
  it('says what was posted, and how long it took from the first keystroke', () => {
    const document = BlogDocumentSchema.parse({
      title: 'Goa',
      body: 'x'.repeat(600),
      photos: [photo],
      place: { name: 'Goa' },
      linkedQuestKey: '00000000-0000-4000-8000-0000000000a1',
      startedAt: '2026-11-24T10:00:00Z',
    });
    const properties = publishedProperties(KEY, document, 'unlisted', NOW);
    expect(properties).toEqual({
      blog_id: KEY,
      visibility: 'unlisted',
      photos: 1,
      chars_bucket: '501-2000',
      has_quest: true,
      has_place: true,
      minutes_since_start: 30,
    });
    expect(propertyProblems(SERVER_EVENTS.blog_published, properties)).toEqual([]);
  });

  it('leaves minutes_since_start out without a start, and is still valid', () => {
    const properties = publishedProperties(KEY, BlogDocumentSchema.parse({ title: 'Goa', body: 'Hi' }), 'public', NOW);
    expect(properties).toMatchObject({ has_quest: false, has_place: false, minutes_since_start: undefined });
    expect(propertyProblems(SERVER_EVENTS.blog_published, properties)).toEqual([]);
  });
});

describe('blog_managed', () => {
  const changes: [Parameters<typeof managedProperties>[1], string][] = [
    [{ action: 'edit' }, 'none'],
    [{ action: 'delete' }, 'none'],
    [{ action: 'visibility', visibility: 'private' }, 'private'],
    [{ action: 'comments', on: false }, 'off'],
    [{ action: 'comments', on: true }, 'on'],
  ];

  it('names the action and the new value, valid for the taxonomy', () => {
    for (const [change, value] of changes) {
      const properties = managedProperties(KEY, change);
      expect(properties).toEqual({ blog_id: KEY, action: change.action, value });
      expect(propertyProblems(SERVER_EVENTS.blog_managed, properties)).toEqual([]);
    }
  });
});

describe('blog_liked and blog_comment_posted', () => {
  it('are in the taxonomy with the properties the actions send', () => {
    expect(
      propertyProblems(SERVER_EVENTS.blog_liked, { blog_id: KEY, unlike: false, source: 'after_sign_in' }),
    ).toEqual([]);
    expect(propertyProblems(SERVER_EVENTS.blog_comment_posted, { blog_id: KEY, length: 300 })).toEqual([]);
  });
});
