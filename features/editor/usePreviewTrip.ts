'use client';

import { useMemo } from 'react';
import { draftToTripData } from '@/lib/trip/toTripData';
import { getTemplate } from '@/templates/registry';
import { useDraft } from './draftStore';
import type { Creator } from './getCreator';
import { withLocalPreviews } from './localPreview';

// The draft as its viewers will see it: the same toTripData path as the real Quest page (M7),
// with this device's local previews for photos that may still be uploading.

export function usePreviewTrip(creator: Creator) {
  const { key, photoFolder, seed, visibility, savedAt, document, previews } = useDraft();
  return useMemo(() => {
    if (!key || !photoFolder || seed === undefined || !document) return undefined;
    const template = getTemplate(document.templateId);
    const trip = draftToTripData(
      { key, photoFolder, visibility, savedAt: savedAt ?? '', document },
      { handle: creator.handle, name: creator.name, avatar_url: null },
      seed,
      template.defaults,
    );
    return { trip: withLocalPreviews(trip, previews), template };
  }, [key, photoFolder, seed, visibility, savedAt, document, previews, creator]);
}
