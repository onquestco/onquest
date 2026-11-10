'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDraft } from './draftStore';
import { PickPhotos } from './PickPhotos';
import { sampleUploadDeps } from './sampleUploadDeps';
import type { Tile } from './usePickPhotos';

// The key exists from the first pick so uploads can start at once; the draft row is created on
// Next (spec A §3.2). Until the drafts backend lands (A-03/A-04) uploads run on sample data.
export function NewQuestView() {
  const router = useRouter();
  const start = useDraft((state) => state.start);
  const [tripKey] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => new Date().toISOString());

  function next(tiles: Tile[]) {
    const picked = tiles.flatMap((tile) =>
      tile.photo ? [{ ...tile.photo, takenAt: tile.photo.takenAt, previewUrl: tile.previewUrl }] : [],
    );
    start(tripKey, picked, startedAt);
    router.push(`/quests/${tripKey}/arrange`);
  }

  return <PickPhotos tripKey={tripKey} deps={sampleUploadDeps} onNext={next} />;
}
