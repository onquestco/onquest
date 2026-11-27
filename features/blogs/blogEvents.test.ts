import { describe, expect, it } from 'vitest';
import { expectNoProblems, validateEvent } from '@/lib/analytics/validate';
import { BlogDocumentSchema } from '@/lib/blog/schema';
import {
  charsBucket,
  commentPostedProperties,
  commentsToggledProperties,
  createStartedProperties,
  draftDeletedProperties,
  draftSavedProperties,
  editorActionProperties,
  likedProperties,
  postedDeletedProperties,
  publishedProperties,
  updatedProperties,
  visibilityChangedProperties,
} from './blogEvents';

// Each builder fills every required property of its v2 event (analytics v2 §4.2), so nothing is
// stripped or reported when it's sent.

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

describe('blog_create_started', () => {
  it('sends where the composer was opened from as click_loc', () => {
    expect(createStartedProperties(KEY, 'create')).toEqual({ blog_id: KEY, click_loc: 0 });
    expect(createStartedProperties(KEY, 'write_your_own')).toEqual({ blog_id: KEY, click_loc: 1 });
    expectNoProblems('blog_create_started', createStartedProperties(KEY, 'write_your_own'));
  });
});

describe('blog_editor_action', () => {
  it('Link a Quest, Remove linked Quest and Preview (was blog_quest_linked, blog_previewed)', () => {
    expect(editorActionProperties(KEY, 'link_quest')).toEqual({ blog_id: KEY, action: 3 });
    expect(editorActionProperties(KEY, 'remove_quest')).toEqual({ blog_id: KEY, action: 7 });
    expect(editorActionProperties(KEY, 'preview')).toEqual({ blog_id: KEY, action: 5 });
    for (const action of ['link_quest', 'remove_quest', 'preview'] as const) {
      expectNoProblems('blog_editor_action', editorActionProperties(KEY, action));
    }
  });
});

describe('blog_draft_saved', () => {
  it('carries the band and the photo count', () => {
    const properties = draftSavedProperties(KEY, BlogDocumentSchema.parse({ body: 'Hello', photos: [photo] }));
    expect(properties).toEqual({ blog_id: KEY, chars_bucket: '1-500', photo_count: 1 });
    expectNoProblems('blog_draft_saved', properties);
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
      visibility: 1,
      photo_count: 1,
      chars_bucket: '501-2000',
      has_quest_flg: true,
      has_place_flg: true,
      minutes_since_start: 30,
    });
    expectNoProblems('blog_published', properties);
  });

  it('an old draft with no startedAt is still sent, without minutes_since_start (spec §8)', () => {
    // A draft stored before startedAt existed: the shape the database still holds.
    const oldDraft = BlogDocumentSchema.parse({ title: 'Goa', body: 'Hi', photos: [] });
    expect(oldDraft.startedAt).toBeUndefined();
    const properties = publishedProperties(KEY, oldDraft, 'public', NOW);
    expect(properties).toMatchObject({ visibility: 0, has_quest_flg: false, has_place_flg: false });
    expect(properties.minutes_since_start).toBeUndefined();
    expectNoProblems('blog_published', properties);
    expect(validateEvent('blog_published', properties).properties).not.toHaveProperty('minutes_since_start');
  });
});

describe('blog_updated', () => {
  it('names the blog only (days_since_post is AN-09’s)', () => {
    expect(updatedProperties(KEY)).toEqual({ blog_id: KEY });
    expectNoProblems('blog_updated', updatedProperties(KEY));
  });
});

describe('content_deleted', () => {
  it('a never-posted draft: counts only (was blog_deleted)', () => {
    const empty = draftDeletedProperties(KEY, BlogDocumentSchema.parse({}));
    expect(empty).toEqual({ content_type: 1, content_id: KEY, was_published_flg: false, photo_count: 0 });
    expectNoProblems('content_deleted', empty);

    const full = draftDeletedProperties(
      KEY,
      BlogDocumentSchema.parse({
        title: 'Goa',
        body: 'x'.repeat(10_000),
        photos: Array.from({ length: 10 }, (_, i) => ({ ...photo, id: `00000000-0000-4000-8000-00000000010${i}` })),
      }),
    );
    expect(full.photo_count).toBe(10);
    expectNoProblems('content_deleted', full);
  });

  it('a posted blog (was blog_managed {action: delete})', () => {
    expect(postedDeletedProperties(KEY)).toEqual({
      content_type: 1,
      content_id: KEY,
      was_published_flg: true,
    });
    expectNoProblems('content_deleted', postedDeletedProperties(KEY));
  });
});

describe('visibility_changed and comments_toggled (were blog_managed)', () => {
  it('send the new visibility as its code', () => {
    const codes = { public: 0, unlisted: 1, private: 2 } as const;
    for (const [visibility, code] of Object.entries(codes) as [keyof typeof codes, number][]) {
      const properties = visibilityChangedProperties(KEY, visibility);
      expect(properties).toEqual({ content_type: 1, content_id: KEY, to_visibility: code });
      expectNoProblems('visibility_changed', properties);
    }
  });

  it('send the comments switch as a flag', () => {
    for (const on of [true, false]) {
      expect(commentsToggledProperties(KEY, on)).toEqual({
        content_type: 1,
        content_id: KEY,
        comments_on_flg: on,
      });
      expectNoProblems('comments_toggled', commentsToggledProperties(KEY, on));
    }
  });
});

describe('content_liked (was blog_liked)', () => {
  it('sends the source code and the count after the change', () => {
    expect(likedProperties(KEY, true, 'blog_page', 4)).toEqual({
      content_type: 1,
      content_id: KEY,
      unlike_flg: false,
      source: 0,
      like_count_after: 4,
    });
    expect(likedProperties(KEY, false, 'after_sign_in', 0)).toMatchObject({ unlike_flg: true, source: 3 });
    expect(likedProperties(KEY, true, 'feed', 1).source).toBe(2);
    for (const source of ['blog_page', 'feed', 'after_sign_in'] as const) {
      expectNoProblems('content_liked', likedProperties(KEY, true, source, 1));
    }
  });
});

describe('comment_posted (was blog_comment_posted)', () => {
  it('sends the length in code points, never the text', () => {
    const properties = commentPostedProperties(KEY, '😀 Lovely');
    expect(properties).toEqual({ content_type: 1, content_id: KEY, comment_length: 8 });
    expect(JSON.stringify(properties)).not.toContain('Lovely');
    expectNoProblems('comment_posted', properties);
    expectNoProblems('comment_posted', commentPostedProperties(KEY, 'x'.repeat(300)));
  });
});
