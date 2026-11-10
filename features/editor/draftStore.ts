'use client';

import { create } from 'zustand';
import type { QuestDocument } from '@/lib/trip/schema';
import type { DraftPhotoInput } from './buildDocument';

// The Quest being created, kept in memory across Pick photos → Arranging → Review while the drafts
// backend doesn't exist yet (A-03/A-04 will load and autosave it). Undo keeps up to 20 snapshots.

const MAX_UNDO = 20;

export type PickedForDraft = DraftPhotoInput & { previewUrl: string };

type DraftState = {
  key?: string;
  startedAt?: string;
  picked: PickedForDraft[];
  previews: Record<string, string>;
  document?: QuestDocument;
  history: QuestDocument[];
  start: (key: string, picked: PickedForDraft[], startedAt: string) => void;
  setDocument: (document: QuestDocument) => void;
  /** An edit the traveller can undo. */
  apply: (document: QuestDocument) => void;
  undo: () => void;
  addPreviews: (photos: { id: string; previewUrl: string }[]) => void;
};

export const useDraft = create<DraftState>()((set) => ({
  picked: [],
  previews: {},
  history: [],
  start: (key, picked, startedAt) =>
    set({
      key,
      startedAt,
      picked,
      previews: Object.fromEntries(picked.map((photo) => [photo.id, photo.previewUrl])),
      document: undefined,
      history: [],
    }),
  setDocument: (document) => set({ document }),
  apply: (document) =>
    set((state) => ({
      document,
      history: state.document ? [...state.history, state.document].slice(-MAX_UNDO) : state.history,
    })),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      return previous ? { document: previous, history: state.history.slice(0, -1) } : state;
    }),
  addPreviews: (photos) =>
    set((state) => ({
      previews: { ...state.previews, ...Object.fromEntries(photos.map((photo) => [photo.id, photo.previewUrl])) },
    })),
}));
