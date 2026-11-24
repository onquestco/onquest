'use client';

import { useEffect, useRef, useState, type UIEvent } from 'react';
import { CloseIcon } from '@/design-system/components/icons';
import type { GalleryPhoto } from './BlogGallery';

type Props = {
  photos: GalleryPhoto[];
  title: string;
  /** The photo tapped; null when closed. */
  openAt: number | null;
  onClose: () => void;
};

const round =
  'flex size-11 items-center justify-center rounded-pill bg-surface text-ink shadow-float focus-visible:outline-2 focus-visible:outline-brand-strong';

/**
 * A gallery photo full screen (PRD B5), swiped sideways like the gallery, with "2 / 4" and Close.
 * A modal <dialog>: Escape (and Android's back) closes it, and focus stays inside.
 */
export function BlogPhotoViewer({ photos, title, openAt, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (openAt === null) {
      if (element.open) element.close();
      return;
    }
    if (!element.open) element.showModal();
    // Straight to the photo tapped, without an animated scroll through the others.
    const strip = list.current;
    if (strip) strip.scrollTo({ left: openAt * strip.clientWidth, behavior: 'instant' });
  }, [openAt]);

  function onScroll(event: UIEvent<HTMLUListElement>) {
    const strip = event.currentTarget;
    if (strip.clientWidth === 0) return;
    setCurrent(Math.min(photos.length - 1, Math.max(0, Math.round(strip.scrollLeft / strip.clientWidth))));
  }

  return (
    <dialog
      ref={dialog}
      aria-label={`Photos of ${title}`}
      onClose={onClose}
      className="m-0 h-svh max-h-none w-full max-w-none bg-night p-0 text-on-night backdrop:bg-night"
    >
      <ul
        ref={list}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {photos.map((photo, index) => (
          <li key={photo.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            <img
              src={photo.display}
              alt={`Photo ${index + 1} of ${title}`}
              width={photo.width}
              height={photo.height}
              loading={openAt !== null && Math.abs(index - openAt) <= 1 ? 'eager' : 'lazy'}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          </li>
        ))}
      </ul>
      <div className="fixed inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
        {photos.length > 1 ? (
          <span className="rounded-pill bg-night-band/60 px-3 py-1 text-label font-semibold text-on-night">
            {current + 1} / {photos.length}
          </span>
        ) : (
          <span />
        )}
        <button type="button" className={round} aria-label="Close full screen" onClick={onClose} autoFocus>
          <CloseIcon size={20} />
        </button>
      </div>
    </dialog>
  );
}
