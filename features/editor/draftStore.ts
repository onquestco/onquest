'use client';

import { create } from 'zustand';
import { photoUrls } from '@/lib/storage';
import type { QuestDocument, Visibility } from '@/lib/trip/schema';
import type { DraftPhotoInput } from './buildDocument';
import type { PickedPhoto } from './upload';

// The Quest being created or edited (spec A §6). Loaded from the draft row on every editor screen,
// kept in memory between them, and autosaved (useAutosave). Undo keeps up to 20 snapshots.

const MAX_UNDO = 20;

export type PickedForDraft = DraftPhotoInput & { previewUrl: string; gps?: PickedPhoto['gps'] };

export type Published = { slug: string; visibility: Visibility; path: string };

export type SaveStatus = 'saved' | 'saving' | 'retrying' | 'conflict';

/** What the server knows about a draft (getQuestDraft), enough to resume editing it. */
export type LoadedDraft = {
  key: string;
  photoFolder: string;
  seed: number;
  ownerHandle: string;
  draftSavedAt: string;
  tripSavedAt: string;
  status: 'draft' | 'published';
  visibility: Visibility;
  slug?: string;
  document: QuestDocument;
};

type DraftState = {
  key?: string;
  photoFolder?: string;
  seed?: number;
  /** Conflict tokens: the saved_at of the rows this copy is based on. */
  savedAt?: string;
  tripSavedAt?: string;
  visibility: Visibility;
  /** Set once the Quest is published; its link never changes after that (spec A §3.6). */
  published?: Published;
  startedAt?: string;
  picked: PickedForDraft[];
  previews: Record<string, string>;
  document?: QuestDocument;
  history: QuestDocument[];
  /** Bumped on every change, so a save knows whether something changed while it ran. */
  version: number;
  savedVersion: number;
  saveStatus: SaveStatus;

  /** "Next" on Pick photos: the draft row exists, nothing is arranged yet. */
  start: (
    draft: { key: string; photoFolder: string; savedAt: string; startedAt: string },
    picked: PickedForDraft[],
  ) => void;
  load: (draft: LoadedDraft) => void;
  /** A change that isn't undone with Undo (title, template, arranging). */
  setDocument: (document: QuestDocument) => void;
  /** An edit the traveller can undo. */
  apply: (document: QuestDocument) => void;
  undo: () => void;
  addPreviews: (photos: { id: string; previewUrl: string }[]) => void;
  /** The server saved `version` of the document as `savedAt`. */
  markSaved: (savedAt: string, version: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setPublished: (published: Published, tripSavedAt: string) => void;
};

function storedPreviews(folder: string, document: QuestDocument): Record<string, string> {
  return Object.fromEntries(document.photos.map((photo) => [photo.id, photoUrls(folder, photo.id).display]));
}

export const useDraft = create<DraftState>()((set) => ({
  visibility: 'public',
  picked: [],
  previews: {},
  history: [],
  version: 0,
  savedVersion: 0,
  saveStatus: 'saved',
  start: ({ key, photoFolder, savedAt, startedAt }, picked) =>
    set({
      key,
      photoFolder,
      seed: undefined,
      savedAt,
      tripSavedAt: savedAt, // create_trip writes both rows at the same moment
      startedAt,
      picked,
      previews: Object.fromEntries(picked.map((photo) => [photo.id, photo.previewUrl])),
      document: undefined,
      history: [],
      published: undefined,
      version: 0,
      savedVersion: 0,
      saveStatus: 'saved',
    }),
  load: (draft) =>
    set((state) => ({
      key: draft.key,
      photoFolder: draft.photoFolder,
      seed: draft.seed,
      savedAt: draft.draftSavedAt,
      tripSavedAt: draft.tripSavedAt,
      visibility: draft.visibility,
      published:
        draft.status === 'published' && draft.slug
          ? {
              slug: draft.slug,
              visibility: draft.visibility,
              path: `/@${draft.ownerHandle}/${draft.slug}`,
            }
          : undefined,
      startedAt: draft.document.startedAt,
      picked: [],
      // Photos picked on this device keep their local previews (uploads may still be running).
      previews: { ...storedPreviews(draft.photoFolder, draft.document), ...state.previews },
      document: draft.document,
      history: [],
      version: 0,
      savedVersion: 0,
      saveStatus: 'saved',
    })),
  setDocument: (document) => set((state) => ({ document, version: state.version + 1 })),
  apply: (document) =>
    set((state) => ({
      document,
      version: state.version + 1,
      history: state.document ? [...state.history, state.document].slice(-MAX_UNDO) : state.history,
    })),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      return previous
        ? { document: previous, history: state.history.slice(0, -1), version: state.version + 1 }
        : state;
    }),
  addPreviews: (photos) =>
    set((state) => ({
      previews: {
        ...state.previews,
        ...Object.fromEntries(photos.map((photo) => [photo.id, photo.previewUrl])),
      },
    })),
  markSaved: (savedAt, version) =>
    set((state) => ({
      savedAt,
      savedVersion: Math.max(state.savedVersion, version),
      saveStatus: 'saved',
    })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setPublished: (published, tripSavedAt) => set({ published, tripSavedAt, visibility: published.visibility }),
}));
