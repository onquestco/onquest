'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Toast } from '@/design-system/components/Toast';
import type { QuestCreateSource } from '@/lib/analytics/sources';
import { createQuest } from './actions';
import { browserUploadDeps } from './browserUploadDeps';
import { useDraft } from './draftStore';
import { PickPhotos } from './PickPhotos';
import type { Tile } from './usePickPhotos';

type Props = { userId: string; source: QuestCreateSource };

// The key exists from the first pick so uploads can start at once; the draft row is created on
// Next (spec A §3.2), so quest_draft_created fires where the taxonomy says.
export function NewQuestView({ userId, source }: Props) {
  const router = useRouter();
  const start = useDraft((state) => state.start);
  const [tripKey] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => new Date().toISOString());
  const [problem, setProblem] = useState<string>();
  const photoFolder = `${userId}/${tripKey}`;
  const [deps] = useState(() => () => browserUploadDeps(photoFolder));

  async function next(tiles: Tile[]) {
    // A photo that failed to upload stays behind: Retry or Remove it first.
    const picked = tiles.flatMap((tile) =>
      tile.photo && tile.status !== 'failed' ? [{ ...tile.photo, previewUrl: tile.previewUrl }] : [],
    );
    const result = await createQuest({ key: tripKey, source, startedAt }).catch(() => null);
    if (!result?.ok || !result.data.created) {
      setProblem("Couldn't start your Quest. Check your connection and tap Next again.");
      return;
    }
    start({ key: tripKey, photoFolder, savedAt: result.data.savedAt, startedAt }, picked);
    router.push(`/quests/${tripKey}/arrange`);
  }

  return (
    <>
      <PickPhotos tripKey={tripKey} deps={deps} onNext={(tiles) => void next(tiles)} />
      {problem && <Toast message={problem} onDismiss={() => setProblem(undefined)} />}
    </>
  );
}
