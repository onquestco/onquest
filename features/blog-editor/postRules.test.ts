import { describe, expect, it } from 'vitest';
import type { BlogDocument } from '@/lib/blog/schema';
import { canPost, hasContent, POST_EMPTY_MESSAGE } from './postRules';

const doc = (change: Partial<BlogDocument> = {}): BlogDocument => ({ body: '', photos: [], ...change });
const photo = { id: '00000000-0000-4000-8000-000000000001', width: 1600, height: 1200 };

describe('canPost', () => {
  it('refuses a title with no text and no photo, with the PRD message', () => {
    expect(canPost(doc({ title: 'Goa on 15k' }), [])).toEqual({ ok: false, reason: 'empty' });
    expect(POST_EMPTY_MESSAGE).toBe('Add a title and some text or a photo.');
  });

  it('refuses text or photos without a title', () => {
    expect(canPost(doc({ body: 'We stayed in Anjuna.' }), [])).toEqual({ ok: false, reason: 'empty' });
    expect(canPost(doc({ title: '   ', photos: [photo] }), [])).toEqual({ ok: false, reason: 'empty' });
  });

  it('allows a title with text, or a title with a photo', () => {
    expect(canPost(doc({ title: 'Goa', body: 'Stayed in Anjuna.' }), [])).toEqual({ ok: true });
    expect(canPost(doc({ title: 'Goa', photos: [photo] }), [])).toEqual({ ok: true });
  });

  it('waits while a photo is uploading, and while one has failed', () => {
    const ready = doc({ title: 'Goa', body: 'Text' });
    expect(canPost(ready, [{ state: 'uploading' }])).toEqual({ ok: false, reason: 'uploading' });
    expect(canPost(ready, [{ state: 'failed' }])).toEqual({ ok: false, reason: 'photo_failed' });
  });
});

describe('hasContent', () => {
  it('is false for an untouched composer and true once anything is added', () => {
    expect(hasContent(doc())).toBe(false);
    expect(hasContent(doc({ title: '  ', body: '\n' }))).toBe(false);
    expect(hasContent(doc({ title: 'G' }))).toBe(true);
    expect(hasContent(doc({ photos: [photo] }))).toBe(true);
    expect(hasContent(doc({ place: { name: 'Goa' } }))).toBe(true);
  });
});
