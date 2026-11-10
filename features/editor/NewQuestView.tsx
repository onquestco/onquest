'use client';

import { useState } from 'react';
import { PickPhotos } from './PickPhotos';
import { sampleUploadDeps } from './sampleUploadDeps';

// The key exists from the first pick so uploads can start at once; the draft row is created on
// Next (spec A §3.2). Until the drafts backend lands (A-03/A-04) uploads run on sample data.
export function NewQuestView() {
  const [tripKey] = useState(() => crypto.randomUUID());
  return <PickPhotos tripKey={tripKey} deps={sampleUploadDeps} nextHref={`/quests/${tripKey}/arrange`} />;
}
