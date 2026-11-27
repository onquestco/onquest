import { MIN_PHOTOS_TO_PUBLISH } from '@/lib/trip/limits';
import type { TileStatus } from './usePickPhotos';

type NextButton = { label: string; disabled: boolean; loading: boolean };

/**
 * What the Pick photos "Next" button says. While it waits (photos still being prepared, or Next
 * tapped and the Quest starting) it shows real progress, so a slow phone never looks like a missed tap.
 * Failed photos are left behind on Next, so they don't count.
 */
export function nextButton(statuses: TileStatus[], submitting: boolean): NextButton {
  const kept = statuses.filter((status) => status !== 'failed');
  const total = kept.length;
  const preparing = kept.filter((status) => status === 'processing').length;
  const uploaded = kept.filter((status) => status === 'done').length;

  if (submitting) {
    const label = uploaded < total ? `Uploading photos… ${uploaded} of ${total}` : 'Preparing…';
    return { label, disabled: true, loading: true };
  }
  if (statuses.length < MIN_PHOTOS_TO_PUBLISH) {
    return { label: `Pick at least ${MIN_PHOTOS_TO_PUBLISH} photos`, disabled: true, loading: false };
  }
  if (preparing > 0) {
    return { label: `Preparing photos… ${total - preparing} of ${total}`, disabled: true, loading: true };
  }
  return { label: 'Next', disabled: false, loading: false };
}
