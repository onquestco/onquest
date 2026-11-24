import { createStore, type StoreApi } from 'zustand/vanilla';
import type { BlogDocument, BlogPhoto } from '@/lib/blog/schema';
import type { Visibility } from '@/lib/trip/schema';
import type { UploadFailure } from '@/features/editor/upload';
import { hasContent } from './postRules';

// The blog being written (spec §6.1). One store per composer, made from what the page loaded, so
// the server renders the draft straight away (no spinner) and nothing is shared between requests.

export type SaveStatus = 'saved' | 'saving' | 'retrying' | 'offline' | 'conflict';

/** A picked photo that isn't in the blog yet: uploading, or failed with Retry and Remove. */
export type PendingPhoto = {
  uploadId: string;
  /** Known once the worker has processed it. */
  photo?: BlogPhoto;
  state: 'uploading' | 'failed';
  failure?: UploadFailure;
  previewUrl: string;
};

export type Published = { slug: string; path: string; visibility: Visibility };

export type InitialBlogDraft = {
  key: string;
  /** The signed-in writer: this device's backups are kept per account (localDraft.ts). */
  ownerKey: string;
  photoFolder: string;
  /** The draft row's saved_at; null until the first save creates the rows. */
  draftSavedAt: string | null;
  blogSavedAt: string | null;
  status: 'draft' | 'published';
  published?: Published;
  /** The Post sheet's starting choice: the live row's visibility (the Settings default until posted). */
  visibility: Visibility;
  document: BlogDocument;
};

export type BlogDraftState = InitialBlogDraft & {
  /** Bumped on every change, so a save knows whether something changed while it ran. */
  version: number;
  savedVersion: number;
  saveStatus: SaveStatus;
  /** The save said this blog isn't there any more (deleted in another tab). */
  lost: boolean;
  pending: PendingPhoto[];
  /** Local previews of photos picked on this device, by photo id. */
  previews: Record<string, string>;
  mode: 'edit' | 'preview';

  change: (update: Partial<BlogDocument>) => void;
  /** The server saved `version` as `savedAt`; the first save also made the live row. */
  markSaved: (savedAt: string, version: number, created: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLost: () => void;
  setMode: (mode: 'edit' | 'preview') => void;
  addPending: (photo: PendingPhoto) => void;
  updatePending: (uploadId: string, change: Partial<PendingPhoto>) => void;
  removePending: (uploadId: string) => void;
  /** A photo finished uploading: it joins the blog at the end. */
  photoUploaded: (uploadId: string, photo: BlogPhoto) => void;
  setPublished: (published: Published, blogSavedAt: string) => void;
};

export type BlogDraftStore = StoreApi<BlogDraftState>;

/** startedAt is set by the first content typed or photo picked (minutes_since_start). */
function withStart(document: BlogDocument, now: () => Date): BlogDocument {
  return document.startedAt || !hasContent(document) ? document : { ...document, startedAt: now().toISOString() };
}

export function createBlogDraftStore(initial: InitialBlogDraft, now: () => Date = () => new Date()): BlogDraftStore {
  return createStore<BlogDraftState>()((set) => ({
    ...initial,
    version: 0,
    savedVersion: 0,
    saveStatus: 'saved',
    lost: false,
    pending: [],
    previews: {},
    mode: 'edit',

    change: (update) =>
      set((state) => ({ document: withStart({ ...state.document, ...update }, now), version: state.version + 1 })),
    markSaved: (savedAt, version, created) =>
      set((state) => ({
        draftSavedAt: savedAt,
        // create_blog writes both rows at the same moment.
        blogSavedAt: created ? savedAt : state.blogSavedAt,
        savedVersion: Math.max(state.savedVersion, version),
        saveStatus: 'saved',
      })),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setLost: () => set({ lost: true }),
    setMode: (mode) => set({ mode }),
    addPending: (photo) =>
      set((state) => ({
        pending: [...state.pending, photo],
        // Picking a photo starts the blog too.
        document: state.document.startedAt ? state.document : { ...state.document, startedAt: now().toISOString() },
      })),
    updatePending: (uploadId, change) =>
      set((state) => ({
        pending: state.pending.map((photo) => (photo.uploadId === uploadId ? { ...photo, ...change } : photo)),
      })),
    removePending: (uploadId) =>
      set((state) => ({ pending: state.pending.filter((photo) => photo.uploadId !== uploadId) })),
    photoUploaded: (uploadId, photo) =>
      set((state) => {
        const waiting = state.pending.find((item) => item.uploadId === uploadId);
        // Removed while it was uploading: it never joins the blog.
        if (!waiting) return state;
        const alreadyIn = state.document.photos.some((item) => item.id === photo.id);
        return {
          pending: state.pending.filter((item) => item.uploadId !== uploadId),
          previews: { ...state.previews, [photo.id]: waiting.previewUrl },
          document: alreadyIn
            ? state.document
            : withStart({ ...state.document, photos: [...state.document.photos, photo] }, now),
          version: alreadyIn ? state.version : state.version + 1,
        };
      }),
    setPublished: (published, blogSavedAt) =>
      set({ published, blogSavedAt, status: 'published', visibility: published.visibility }),
  }));
}
