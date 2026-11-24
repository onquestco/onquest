import { describe, expect, it } from 'vitest';
import {
  chooseStartingDraft,
  clearLocalDrafts,
  forgetNewBlogKey,
  readLocalDraft,
  readNewBlogKey,
  rememberNewBlogKey,
  removeLocalDraft,
  writeLocalDraft,
  type LocalStorageLike,
} from './localDraft';

function memoryStorage(): LocalStorageLike & { dump: () => Record<string, string> } {
  const items = new Map<string, string>();
  return {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => void items.set(name, value),
    removeItem: (name) => void items.delete(name),
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
    dump: () => Object.fromEntries(items),
  };
}

const KEY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const s1 = '2026-11-24 10:00:00.123456+00';
const s2 = '2026-11-24 10:00:05.654321+00';
const doc = (body: string) => ({ title: 'Goa on 15k', body, photos: [] });

describe('local draft backup', () => {
  it('writes, reads and removes a copy', () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, KEY, { basedOn: s1, document: doc('two paragraphs'), version: 3 });
    expect(readLocalDraft(storage, KEY)).toEqual({ basedOn: s1, document: doc('two paragraphs'), version: 3 });
    removeLocalDraft(storage, KEY);
    expect(readLocalDraft(storage, KEY)).toBeNull();
  });

  it('keeps a copy that is newer than the save that just finished', () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, KEY, { basedOn: s1, document: doc('newer'), version: 5 });
    removeLocalDraft(storage, KEY, 4);
    expect(readLocalDraft(storage, KEY)?.version).toBe(5);
    removeLocalDraft(storage, KEY, 5);
    expect(readLocalDraft(storage, KEY)).toBeNull();
  });

  it('ignores a broken entry and a browser that refuses storage', () => {
    const storage = memoryStorage();
    storage.setItem(`oq_blog_draft:${KEY}`, '{not json');
    expect(readLocalDraft(storage, KEY)).toBeNull();
    const refusing: LocalStorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => undefined,
      key: () => null,
      length: 0,
    };
    expect(() => writeLocalDraft(refusing, KEY, { basedOn: null, document: doc(''), version: 1 })).not.toThrow();
    expect(readLocalDraft(refusing, KEY)).toBeNull();
    expect(readLocalDraft(null, KEY)).toBeNull();
  });

  it('remembers the unsaved new blog until its first save', () => {
    const storage = memoryStorage();
    rememberNewBlogKey(storage, KEY);
    expect(readNewBlogKey(storage)).toBe(KEY);
    forgetNewBlogKey(storage, OTHER);
    expect(readNewBlogKey(storage)).toBe(KEY);
    forgetNewBlogKey(storage, KEY);
    expect(readNewBlogKey(storage)).toBeNull();
  });

  it('sign-out clears every blog draft and nothing else', () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, KEY, { basedOn: s1, document: doc('a'), version: 1 });
    writeLocalDraft(storage, OTHER, { basedOn: null, document: doc('b'), version: 1 });
    rememberNewBlogKey(storage, OTHER);
    storage.setItem('oq_anon_id', 'keep');
    clearLocalDrafts(storage);
    expect(storage.dump()).toEqual({ oq_anon_id: 'keep' });
  });
});

describe('chooseStartingDraft', () => {
  const server = { draftSavedAt: s2, blogSavedAt: s1, document: doc('saved') };

  it('opens the server draft when there is no local copy', () => {
    expect(chooseStartingDraft(server, null)).toEqual({ document: doc('saved'), restored: false, dropLocal: false });
  });

  it('restores unsaved work from this device (same base, different text)', () => {
    const local = { basedOn: s2, document: doc('saved and more'), version: 7 };
    expect(chooseStartingDraft(server, local)).toEqual({
      document: doc('saved and more'),
      restored: true,
      dropLocal: false,
    });
  });

  it('drops the local copy when the server has a newer save from elsewhere (the later save wins)', () => {
    const local = { basedOn: s1, document: doc('older tab text'), version: 7 };
    expect(chooseStartingDraft(server, local)).toEqual({ document: doc('saved'), restored: false, dropLocal: true });
  });

  it('drops a copy that matches the server', () => {
    const local = { basedOn: s2, document: { photos: [], body: 'saved', title: 'Goa on 15k' }, version: 2 };
    expect(chooseStartingDraft(server, local).dropLocal).toBe(true);
  });

  it('a copy from before the first save counts while only that save exists', () => {
    const created = { draftSavedAt: s1, blogSavedAt: s1, document: doc('first') };
    const local = { basedOn: null, document: doc('first and more'), version: 4 };
    expect(chooseStartingDraft(created, local).restored).toBe(true);
    expect(chooseStartingDraft(server, local).dropLocal).toBe(true);
  });
});
