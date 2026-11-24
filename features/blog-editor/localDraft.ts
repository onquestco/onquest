import { z } from 'zod';
import { BlogDocumentSchema, type BlogDocument } from '@/lib/blog/schema';

// The composer's backup on this device (spec §3.2). Every change is copied here (at most every
// 500 ms), so closing the app, losing the connection or a failed save never loses text. Only on
// this device, cleared on sign-out, and never sent anywhere but our own save action.
//
//   oq_blog_draft:{key}  → { userId, basedOn, document, version }
//   oq_blog_draft:new    → { userId, key } of a blog that hasn't reached the server yet
//
// Every entry names the account that wrote it. On a shared phone, another account never sees or
// adopts it: reading someone else's entry removes it instead.
//
// Private browsing can refuse storage: every function here then quietly does nothing.

const PREFIX = 'oq_blog_draft:';
const NEW_KEY = `${PREFIX}new`;

export type LocalStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

const EntrySchema = z.object({
  /** The signed-in user who wrote it. */
  userId: z.string().min(1),
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

/** This user's copy of a blog. Anything else under the key (another account's, or unreadable) is removed. */
export function readLocalDraft(storage: LocalStorageLike | null, key: string, userId: string): LocalDraft | null {
  if (!storage) return null;
  return attempt(() => {
    const raw = storage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = EntrySchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.userId === userId) return parsed.data;
    storage.removeItem(`${PREFIX}${key}`);
    return null;
  }, null);
}

export function writeLocalDraft(storage: LocalStorageLike | null, key: string, entry: LocalDraft): void {
  if (!storage) return;
  attempt(() => storage.setItem(`${PREFIX}${key}`, JSON.stringify(entry)), undefined);
}

/** After a save: the copy goes once the server has this version (or a later one). */
export function removeLocalDraft(
  storage: LocalStorageLike | null,
  key: string,
  saved?: { userId: string; version: number },
): void {
  if (!storage) return;
  if (saved) {
    const entry = readLocalDraft(storage, key, saved.userId);
    if (entry && entry.version > saved.version) return;
  }
  attempt(() => storage.removeItem(`${PREFIX}${key}`), undefined);
}

const NewBlogSchema = z.object({ userId: z.string().min(1), key: z.uuid() });

/**
 * The blog this user was writing on /blogs/new that hasn't been saved to the server yet. Another
 * account's is removed, with its text: it must never be resumed, saved or have its photos
 * uploaded under someone else's account.
 */
export function readNewBlogKey(storage: LocalStorageLike | null, userId: string): string | null {
  if (!storage) return null;
  return attempt(() => {
    const raw = storage.getItem(NEW_KEY);
    if (!raw) return null;
    const parsed = NewBlogSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.userId === userId) return parsed.data.key;
    storage.removeItem(NEW_KEY);
    if (parsed.success) storage.removeItem(`${PREFIX}${parsed.data.key}`);
    return null;
  }, null);
}

export function rememberNewBlogKey(storage: LocalStorageLike | null, key: string, userId: string): void {
  if (!storage) return;
  attempt(() => storage.setItem(NEW_KEY, JSON.stringify({ userId, key })), undefined);
}

export function forgetNewBlogKey(storage: LocalStorageLike | null, key: string, userId: string): void {
  if (!storage || readNewBlogKey(storage, userId) !== key) return;
  attempt(() => storage.removeItem(NEW_KEY), undefined);
}

/**
 * What /blogs/new opens with: this user's unsent blog (resumed, not a new start), or a new key.
 * `saved` means the unsent blog did reach the server: open its edit page instead.
 */
export function startNewBlog(
  storage: LocalStorageLike | null,
  userId: string,
  createKey: () => string,
): { kind: 'saved'; key: string } | { kind: 'resumed'; key: string; document: BlogDocument } | { kind: 'new'; key: string } {
  const unsentKey = readNewBlogKey(storage, userId);
  const unsent = unsentKey ? readLocalDraft(storage, unsentKey, userId) : null;
  if (unsentKey && unsent?.basedOn) return { kind: 'saved', key: unsentKey };
  if (unsentKey && unsent) return { kind: 'resumed', key: unsentKey, document: unsent.document };
  return { kind: 'new', key: createKey() };
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
