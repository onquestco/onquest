'use client';

import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { Button } from '@/design-system/components/Button';
import { Toast } from '@/design-system/components/Toast';
import { MAX_PHOTOS, MIN_PHOTOS_TO_PUBLISH } from '@/lib/trip/limits';
import { PhotoTile } from './PhotoTile';
import type { UploadDeps } from './upload';
import { usePickPhotos } from './usePickPhotos';

type Props = {
  tripKey: string;
  deps: () => UploadDeps;
  /** Where Next goes: the arranging screen for this Quest. */
  nextHref: string;
};

/** Screen 3: pick 3 to 15 photos. Uploading starts the moment a photo is picked. */
export function PickPhotos({ tripKey, deps, nextHref }: Props) {
  const router = useRouter();
  const { tiles, add, retry, remove, online, message, clearMessage } = usePickPhotos(tripKey, deps);
  const enough = tiles.length >= MIN_PHOTOS_TO_PUBLISH;
  const waiting = tiles.some((tile) => tile.status === 'processing');

  function choose(event: ChangeEvent<HTMLInputElement>) {
    add(Array.from(event.target.files ?? []));
    event.target.value = ''; // so the same photo can be picked again after removing it
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-surface px-4 pt-6 pb-28">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-title text-ink">Pick up to {MAX_PHOTOS} photos</h1>
        <span className="shrink-0 rounded-pill bg-brand-wash px-3 py-1 text-label text-ink" aria-live="polite">
          {tiles.length} of {MAX_PHOTOS}
        </span>
      </header>

      {!online && (
        <p role="status" className="rounded-sm bg-brand-wash px-3 py-2 text-label text-ink">
          Waiting for a connection. Your photos are safe.
        </p>
      )}

      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-pill border border-line-control px-6 py-3 text-body font-semibold text-ink has-focus-visible:outline-2 has-focus-visible:outline-brand-strong">
        {tiles.length === 0 ? 'Choose photos' : 'Add more photos'}
        <input type="file" accept="image/*" multiple onChange={choose} className="sr-only" />
      </label>

      <p className="text-caption text-ink-muted">
        Location and camera details are removed from your photos before they leave this phone.
      </p>

      {tiles.length > 0 && (
        <ul className="grid grid-cols-3 gap-1">
          {tiles.map((tile, index) => (
            <PhotoTile
              key={tile.uploadId}
              tile={tile}
              number={index + 1}
              total={tiles.length}
              onRetry={() => retry(tile.uploadId)}
              onRemove={() => remove(tile.uploadId)}
            />
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-4">
        <div className="mx-auto max-w-lg">
          <Button block disabled={!enough || waiting} onClick={() => router.push(nextHref)}>
            {enough ? 'Next' : `Pick at least ${MIN_PHOTOS_TO_PUBLISH} photos`}
          </Button>
        </div>
      </div>

      {message && <Toast message={message} onDismiss={clearMessage} />}
    </main>
  );
}
