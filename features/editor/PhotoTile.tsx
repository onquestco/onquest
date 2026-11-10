'use client';

import { ProgressRing } from '@/design-system/components/ProgressRing';
import type { Tile } from './usePickPhotos';

const PROGRESS = { processing: 0.25, uploading: 0.6, done: 1, failed: 0 } as const;

const FAILURE_TEXT = {
  heic_unsupported: "This browser can't open HEIC photos. Try Safari, or pick a JPEG.",
  unreadable: "This photo couldn't be read.",
  upload_failed: "This photo didn't upload.",
} as const;

type Props = {
  tile: Tile;
  number: number;
  total: number;
  onRetry: () => void;
  onRemove: () => void;
};

export function PhotoTile({ tile, number, total, onRetry, onRemove }: Props) {
  const failed = tile.status === 'failed';
  return (
    <li className="relative aspect-square overflow-hidden rounded-sm bg-surface-page">
      <img src={tile.previewUrl} alt={`Photo ${number} of ${total}`} className="h-full w-full object-cover" />

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove photo ${number}`}
        className="absolute top-1 right-1 flex size-11 items-center justify-center"
      >
        <span aria-hidden className="flex size-6 items-center justify-center rounded-pill bg-brand-strong text-caption font-semibold text-on-brand">
          {number}
        </span>
      </button>

      {(tile.status === 'processing' || tile.status === 'uploading') && (
        <span className="absolute bottom-2 left-2 rounded-pill bg-surface p-0.5">
          <ProgressRing progress={PROGRESS[tile.status]} label={`Uploading photo ${number}`} />
        </span>
      )}

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/90 p-2 text-center">
          <p role="alert" className="text-caption text-danger">
            {FAILURE_TEXT[tile.failure ?? 'upload_failed']}
          </p>
          {tile.failure === 'upload_failed' && (
            <button type="button" onClick={onRetry} className="min-h-11 rounded-pill px-3 text-label font-semibold text-brand-strong">
              Retry
            </button>
          )}
        </div>
      )}
    </li>
  );
}
