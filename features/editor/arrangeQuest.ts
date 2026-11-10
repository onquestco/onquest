import type { GeoPlace } from '@/lib/geo';
import { PHOTOS_PER_PAGE } from '@/lib/trip/limits';
import type { QuestDocument } from '@/lib/trip/schema';
import { arrangePages, type Arrangement } from './arrange';
import { applyPlaces } from './applyPlaces';
import { buildDocument } from './buildDocument';
import type { PickedForDraft } from './draftStore';
import { suggestPlaces } from './suggestPlaces';

// "Arranging your Quest" (spec A §3.2) as one async function with its network calls passed in,
// so the order and the fallbacks are testable without a browser.

export type ArrangeStep = 'sorting' | 'places' | 'captions';

export type ArrangeDeps = {
  nameLocations: (points: { lat: number; lng: number }[]) => Promise<(GeoPlace | null)[] | null>;
  /** Saves the document; false when it couldn't (autosave tries again later). */
  save: (document: QuestDocument) => Promise<boolean>;
  /** Captions written into the saved draft, or [] on a timeout or error. */
  writeCaptions: () => Promise<{ photoId: string; caption: string }[]>;
  createId: () => string;
  onStep: (step: ArrangeStep) => void;
};

export type ArrangeResult = {
  document: QuestDocument;
  captions: { photoId: string; caption: string }[];
  fallbackUsed: boolean;
  failed: boolean;
};

/** Pick order, 3 per page: what the traveller gets when arranging fails. */
function pickOrder(photoIds: string[]): Arrangement {
  const pages = [];
  for (let i = 0; i < photoIds.length; i += PHOTOS_PER_PAGE) {
    pages.push({ photoIds: photoIds.slice(i, i + PHOTOS_PER_PAGE), title: `Page ${pages.length + 1}` });
  }
  return { pages, dateById: new Map(), fallbackUsed: true };
}

export async function arrangeQuest(
  picked: PickedForDraft[],
  startedAt: string | undefined,
  deps: ArrangeDeps,
): Promise<ArrangeResult> {
  deps.onStep('sorting');
  const photos = picked.map(({ id, width, height, takenAt }) => ({ id, width, height, takenAt }));
  let failed = false;
  let arrangement: Arrangement;
  try {
    arrangement = arrangePages(photos.map(({ id, takenAt }) => ({ id, takenAt: takenAt ?? undefined })));
  } catch {
    failed = true;
    arrangement = pickOrder(photos.map((photo) => photo.id));
  }
  let document = buildDocument('beach', photos, arrangement, deps.createId, startedAt);

  const located = picked.flatMap((photo) =>
    photo.gps ? [{ ...photo.gps, photoId: photo.id, takenAt: photo.takenAt }] : [],
  );
  if (located.length > 0) {
    deps.onStep('places');
    const groups = suggestPlaces(located);
    const named = await deps.nameLocations(groups.map(({ lat, lng }) => ({ lat, lng }))).catch(() => null);
    if (named) document = applyPlaces(document, groups, named, deps.createId, true);
  }

  const saved = await deps.save(document).catch(() => false);
  let captions: { photoId: string; caption: string }[] = [];
  if (saved && document.places.length > 0) {
    deps.onStep('captions');
    captions = await deps.writeCaptions().catch(() => []);
  }
  return { document, captions, fallbackUsed: arrangement.fallbackUsed, failed };
}
