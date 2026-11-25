import { describe, expect, it } from 'vitest';
import {
  readNewBlogKey,
  rememberNewBlogKey,
  writeLocalDraft,
  type LocalStorageLike,
} from '@/features/blog-editor/localDraft';
import { draftDeleteOutcome, forgetDeletedDraft } from './draftDelete';

// The delete sheet's outcomes (blogs-editor spec §6.3) and the local copy it clears.

const KEY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const RIYA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function memoryStorage(): LocalStorageLike & { names: () => string[] } {
  const items = new Map<string, string>();
  return {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => void items.set(name, value),
    removeItem: (name) => void items.delete(name),
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
    names: () => [...items.keys()].sort(),
  };
}

const copy = (body: string) => ({ userId: RIYA, basedOn: null, document: { body, photos: [] }, version: 1 });

describe('draftDeleteOutcome', () => {
  it('deleted: the row goes', () => {
    expect(draftDeleteOutcome({ ok: true, data: { deleted: true } })).toBe('deleted');
  });

  it('already gone (not_found) counts as deleted: there is nothing left to show', () => {
    expect(draftDeleteOutcome({ ok: true, data: { deleted: false, error: 'not_found' } })).toBe('deleted');
  });

  it('posted on another device meanwhile: show the latest', () => {
    expect(draftDeleteOutcome({ ok: true, data: { deleted: false, error: 'published' } })).toBe('posted');
  });

  it('failed: an action error, or the request itself failing (offline)', () => {
    expect(draftDeleteOutcome({ ok: false, error: 'Something went wrong' })).toBe('failed');
    expect(draftDeleteOutcome({ ok: false, error: 'Not signed in' })).toBe('failed');
    expect(draftDeleteOutcome(null)).toBe('failed');
  });
});

describe('forgetDeletedDraft', () => {
  it("removes this blog's saved copy and its unsent-blog marker, and nothing else", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, KEY, copy('deleted text'));
    writeLocalDraft(storage, OTHER, copy('another draft'));
    rememberNewBlogKey(storage, KEY, RIYA);

    forgetDeletedDraft(storage, KEY, RIYA);

    expect(storage.names()).toEqual([`oq_blog_draft:${OTHER}`]);
    expect(readNewBlogKey(storage, RIYA)).toBeNull();
  });

  it("keeps the marker when it's for a different blog", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, KEY, copy('deleted text'));
    rememberNewBlogKey(storage, OTHER, RIYA);

    forgetDeletedDraft(storage, KEY, RIYA);

    expect(readNewBlogKey(storage, RIYA)).toBe(OTHER);
    expect(storage.getItem(`oq_blog_draft:${KEY}`)).toBeNull();
  });

  it('does nothing where the browser refuses storage', () => {
    expect(() => forgetDeletedDraft(null, KEY, RIYA)).not.toThrow();
  });
});
