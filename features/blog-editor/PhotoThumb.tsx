'use client';

import type { MouseEventHandler, PointerEventHandler } from 'react';
import { CloseIcon } from '@/design-system/components/icons';
import { ProgressRing } from '@/design-system/components/ProgressRing';
import type { PendingPhoto } from './blogDraftStore';

const FAILURE_TEXT = {
  heic_unsupported: "This browser can't open HEIC photos. Try Safari, or pick a JPEG.",
  unreadable: "This photo couldn't be read.",
  upload_failed: "This photo didn't upload.",
} as const;

// Visible only when focused, so keyboards and screen readers can reorder without crowding the tile.
const moveButton =
  'sr-only focus:not-sr-only focus:absolute focus:bottom-1 focus:z-10 focus:min-h-11 focus:rounded-pill focus:bg-surface focus:px-2 focus:text-caption focus:font-semibold focus:text-ink focus:outline-2 focus:outline-brand-strong';

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="absolute -top-1 -right-1 z-10 flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-brand-strong"
    >
      <span aria-hidden className="flex size-6 items-center justify-center rounded-pill bg-ink text-surface shadow-float">
        <CloseIcon size={14} />
      </span>
    </button>
  );
}

type Props = {
  index: number;
  total: number;
  src: string;
  dragging: boolean;
  dropTarget: boolean;
  /** From usePhotoDrag: press and hold, then drag. */
  pointer: {
    onPointerDown: PointerEventHandler<HTMLLIElement>;
    onPointerMove: PointerEventHandler<HTMLLIElement>;
    onPointerUp: PointerEventHandler<HTMLLIElement>;
    onPointerCancel: PointerEventHandler<HTMLLIElement>;
    onContextMenu: MouseEventHandler<HTMLLIElement>;
  };
  onMove: (to: number) => void;
  onRemove: () => void;
};

/** A photo in the blog: press and hold, then drag to reorder; the first one is the cover. */
export function PhotoThumb({ index, total, src, dragging, dropTarget, onMove, onRemove, pointer }: Props) {
  const number = index + 1;
  return (
    <li
      data-photo-index={index}
      {...pointer}
      // No long-press image menu on iPhones while holding a photo to move it.
      style={{ WebkitTouchCallout: 'none' }}
      className={`relative aspect-square rounded-sm select-none ${dragging ? 'opacity-50' : ''} ${
        dropTarget ? 'outline-2 outline-offset-2 outline-brand-strong' : ''
      }`}
    >
      <img
        src={src}
        alt={index === 0 ? `Photo 1 of ${total}, the cover` : `Photo ${number} of ${total}`}
        draggable={false}
        className="pointer-events-none h-full w-full rounded-sm bg-surface-page object-cover"
      />
      {index === 0 && (
        <span className="absolute bottom-1 left-1 rounded-pill bg-night/60 px-2 py-0.5 text-caption font-semibold text-on-night">
          Cover
        </span>
      )}
      <RemoveButton label={`Remove photo ${number}`} onRemove={onRemove} />
      {index > 0 && (
        <button type="button" onClick={() => onMove(index - 1)} className={`${moveButton} focus:left-1`}>
          Move left
        </button>
      )}
      {index < total - 1 && (
        <button type="button" onClick={() => onMove(index + 1)} className={`${moveButton} focus:right-1`}>
          Move right
        </button>
      )}
    </li>
  );
}

/** A picked photo that isn't in the blog yet: uploading, or failed with Retry and Remove. */
export function PendingThumb({
  photo,
  number,
  onRetry,
  onRemove,
}: {
  photo: PendingPhoto;
  number: number;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const failed = photo.state === 'failed';
  return (
    <li className="relative aspect-square rounded-sm">
      <img src={photo.previewUrl} alt={`Photo ${number}`} className="h-full w-full rounded-sm bg-surface-page object-cover" />
      <RemoveButton label={`Remove photo ${number}`} onRemove={onRemove} />
      {!failed && (
        <span className="absolute bottom-1 left-1 rounded-pill bg-surface p-0.5">
          <ProgressRing progress={photo.photo ? 0.6 : 0.25} label={`Uploading photo ${number}`} />
        </span>
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-surface/90 p-1 text-center">
          <p role="alert" className="text-caption text-danger">
            {FAILURE_TEXT[photo.failure ?? 'upload_failed']}
          </p>
          {photo.failure === 'upload_failed' && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-pill px-3 text-label font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand-strong"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </li>
  );
}
