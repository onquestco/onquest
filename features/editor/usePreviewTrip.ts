'use client';

import { useMemo } from 'react';
import { draftToTripData } from '@/lib/trip/toTripData';
import { getTemplate } from '@/templates/registry';
import { useDraft } from './draftStore';
import type { Creator } from './getCreator';
import { withLocalPreviews } from './localPreview';

// The draft as its viewers will see it: the same toTripData path as the real Quest page (M7).
// The seed is fixed per draft; the real one comes from the drafts backend (A-03).
const SAMPLE_SEED = 20261110;

export function usePreviewTrip(creator: Creator) {
  const { key, document, previews } = useDraft();
  return useMemo(() => {
    if (!key || !document) return undefined;
    const template = getTemplate(document.templateId);
    const trip = draftToTripData(
      { key, photoFolder: `local/${key}`, visibility: 'public', savedAt: 'local', document },
      { handle: creator.handle, name: creator.name, avatar_url: null },
      SAMPLE_SEED,
      template.defaults,
    );
    return { trip: withLocalPreviews(trip, previews), template };
  }, [key, document, previews, creator]);
}
