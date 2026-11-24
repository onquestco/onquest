'use client';

import { useState, type UIEvent } from 'react';

// The blog's photos, swiped sideways with a "1 / 4" counter (PRD B5). Native scroll-snap, so
// swiping feels like the phone's own and never takes over the page's vertical scroll. The first
// photo loads straight away (it's usually the largest thing on screen); the rest load lazily.

export type GalleryPhoto = { id: string; width: number; height: number; display: string };

type Props = {
  photos: GalleryPhoto[];
  title: string;
  /** Opens a photo full screen (the blog page's viewer). Without it, photos aren't buttons. */
  onOpen?: (index: number) => void;
};

export function BlogGallery({ photos, title, onOpen }: Props) {
  const [current, setCurrent] = useState(0);
  if (photos.length === 0) return null;

  function onScroll(event: UIEvent<HTMLUListElement>) {
    const list = event.currentTarget;
    if (list.clientWidth === 0) return;
    setCurrent(Math.min(photos.length - 1, Math.max(0, Math.round(list.scrollLeft / list.clientWidth))));
  }

  return (
    <section aria-label="Photos" data-blog-gallery className="relative -mx-4 sm:mx-0">
      <ul
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth sm:rounded-md"
      >
        {photos.map((photo, index) => {
          const image = (
            <img
              src={photo.display}
              alt={`Photo ${index + 1} of ${title}`}
              width={photo.width}
              height={photo.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : undefined}
              decoding="async"
              className="h-full w-full object-cover"
            />
          );
          return (
            <li key={photo.id} className="aspect-4/3 w-full shrink-0 snap-center bg-surface-page">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(index)}
                  aria-label={`Open photo ${index + 1} full screen`}
                  className="block h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-strong"
                >
                  {image}
                </button>
              ) : (
                image
              )}
            </li>
          );
        })}
      </ul>
      {photos.length > 1 && (
        <p
          aria-live="polite"
          className="absolute top-3 right-3 rounded-pill bg-night/60 px-2.5 py-1 text-caption font-semibold text-on-night"
        >
          {current + 1} / {photos.length}
        </p>
      )}
    </section>
  );
}
