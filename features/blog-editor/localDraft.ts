import { z } from 'zod';
import { BlogDocumentSchema, type BlogDocument } from '@/lib/blog/schema';

// The composer's backup on this device (spec §3.2). Every change is copied here (at most every
// 500 ms), so closing the app, losing the connection or a failed save never loses text. Only on
// this device, cleared on sign-out, and never sent anywhere but our own save action.
//
//   oq_blog_draft:{key}  → { basedOn, document, version }
//   oq_blog_draft:new    → the key of a blog that hasn't reached the server yet
//
// Private browsing can refuse storage: every function here then quietly does nothing.

const PREFIX = 'oq_blog_draft:';
const NEW_KEY = `${PREFIX}new`;

export type LocalStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

const EntrySchema = z.object({
  /** The draft saved_at this copy was based on; null before the blog's first save. */
  basedOn: z.string().nullable(),
  document: BlogDocumentSchema,
  version: z.number().int(),
});

export type LocalDraft = z.infer<typeof EntrySchema>;

/** window.localStorage, or null where the browser refuses it. */
export function browserStorage(): LocalStorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function attempt<T>(work: () => T, fallback: T): T {
  try {
    return work();
  } catch {
    return fallback;
  }
}

export function readLocalDraft(storage: LocalStorageLike | null, key: string): LocalDraft | null {
  if (!storage) return null;
  return attempt(() => {
    const raw = storage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = EntrySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }, null);
}

export function writeLocalDraft(storage: LocalStorageLike | null, key: string, entry: LocalDraft): void {
  if (!storage) return;
  attempt(() => storage.setItem(`${PREFIX}${key}`, JSON.stringify(entry)), undefined);
}

/** After a save: the copy goes once the server has this version (or a later one). */
export function removeLocalDraft(storage: LocalStorageLike | null, key: string, savedVersion?: number): void {
  if (!storage) return;
  if (savedVersion !== undefined) {
    const entry = readLocalDraft(storage, key);
    if (entry && entry.version > savedVersion) return;
  }
  attempt(() => storage.removeItem(`${PREFIX}${key}`), undefined);
}

/** The blog being written on /blogs/new that hasn't been saved to the server yet. */
export function readNewBlogKey(storage: LocalStorageLike | null): string | null {
  if (!storage) return null;
  return attempt(() => {
    const key = storage.getItem(NEW_KEY);
    return key && z.uuid().safeParse(key).success ? key : null;
  }, null);
}

export function rememberNewBlogKey(storage: LocalStorageLike | null, key: string): void {
  if (!storage) return;
  attempt(() => storage.setItem(NEW_KEY, key), undefined);
}

export function forgetNewBlogKey(storage: LocalStorageLike | null, key: string): void {
  if (!storage || readNewBlogKey(storage) !== key) return;
  attempt(() => storage.removeItem(NEW_KEY), undefined);
}

/** Sign-out: nothing of anyone's writing stays on a shared phone. */
export function clearLocalDrafts(storage: LocalStorageLike | null = browserStorage()): void {
  if (!storage) return;
  attempt(() => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const name = storage.key(i);
      if (name?.startsWith(PREFIX)) keys.push(name);
    }
    keys.forEach((name) => storage.removeItem(name));
  }, undefined);
}

export type ServerDraft = {
  /** The draft row's saved_at. */
  draftSavedAt: string;
  /** The live row's saved_at: equal to the draft's while only the first save has happened. */
  blogSavedAt: string;
  document: BlogDocument;
};

/**
 * Which text the composer opens with (spec §3.2):
 * - the local copy was based on the server's current draft but differs: unsaved work from this
 *   device, restored and saved at once;
 * - it was based on an older save: the server has a newer one from somewhere else, and the later
 *   save wins, so the local copy is dropped.
 * A copy made before the first save reached this device's answer (basedOn null) counts as based on
 * that first save, as long as nothing has been saved since.
 */
export function chooseStartingDraft(
  server: ServerDraft,
  local: LocalDraft | null,
): { document: BlogDocument; restored: boolean; dropLocal: boolean } {
  if (!local) return { document: server.document, restored: false, dropLocal: false };
  const onlyFirstSave = server.draftSavedAt === server.blogSavedAt;
  const sameBase =
    local.basedOn === server.draftSavedAt || (local.basedOn === null && onlyFirstSave);
  if (!sameBase) return { document: server.document, restored: false, dropLocal: true };
  if (sameDocument(local.document, server.document)) {
    return { document: server.document, restored: false, dropLocal: true };
  }
  return { document: local.document, restored: true, dropLocal: false };
}

function sameDocument(left: BlogDocument, right: BlogDocument): boolean {
  return JSON.stringify(normalise(left)) === JSON.stringify(normalise(right));
}

/** Key order and absent-vs-undefined don't make two documents different. */
function normalise(document: BlogDocument) {
  return {
    title: document.title ?? '',
    body: document.body,
    photos: document.photos.map(({ id, width, height }) => ({ id, width, height })),
    place: document.place
      ? {
          name: document.place.name,
          city: document.place.city ?? null,
          countryCode: document.place.countryCode ?? null,
          geoRef: document.place.geoRef ?? null,
        }
      : null,
    linkedQuestKey: document.linkedQuestKey ?? null,
  };
}
