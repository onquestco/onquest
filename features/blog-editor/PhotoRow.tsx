'use client';

import type { ChangeEvent } from 'react';
import { useStore } from 'zustand';
import { PlusIcon } from '@/design-system/components/icons';
import { Toast } from '@/design-system/components/Toast';
import { BLOG_MAX_PHOTOS } from '@/lib/blog/limits';
import { photoUrls } from '@/lib/storage';
import type { BlogDraftStore } from './blogDraftStore';
import { PendingThumb, PhotoThumb } from './PhotoThumb';
import { useBlogPhotos } from './useBlogPhotos';
import { usePhotoDrag } from './usePhotoDrag';

// "+ Add photos", then square thumbnails (PRD B2): press and hold one, then drag to reorder (the
// first is the cover), × to remove, "4 of 10". A quick swipe over the photos scrolls the page
// (usePhotoDrag). The move buttons on each photo do the same for keyboards and screen readers.

export function PhotoRow({ store }: { store: BlogDraftStore }) {
  const photos = useStore(store, (state) => state.document.photos);
  const pending = useStore(store, (state) => state.pending);
  const previews = useStore(store, (state) => state.previews);
  const folder = useStore(store, (state) => state.photoFolder);
  const { add, retry, removeWaiting, removeFromBlog, move, message, clearMessage } = useBlogPhotos(store);
  const { drag, listRef, handlers } = usePhotoDrag(move);
  const count = photos.length + pending.length;

  function choose(event: ChangeEvent<HTMLInputElement>) {
    add(Array.from(event.target.files ?? []));
    event.target.value = ''; // so the same photo can be picked again after removing it
  }

  return (
    <section aria-label="Photos" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-label text-ink-muted">Photos</h2>
        <span aria-live="polite" className="rounded-pill bg-brand-wash px-3 py-1 text-caption font-semibold text-ink">
          {count} of {BLOG_MAX_PHOTOS}
        </span>
      </div>
      <ul ref={listRef} className="grid grid-cols-3 gap-2">
        <li>
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-line-control bg-surface text-center text-caption font-semibold text-ink-muted has-focus-visible:outline-2 has-focus-visible:outline-brand-strong">
            <PlusIcon size={20} />
            Add photos
            <input type="file" accept="image/*" multiple onChange={choose} className="sr-only" />
          </label>
        </li>
        {photos.map((photo, index) => (
          <PhotoThumb
            key={photo.id}
            index={index}
            total={photos.length}
            src={previews[photo.id] ?? photoUrls(folder, photo.id).thumb}
            dragging={drag?.from === index}
            dropTarget={drag !== null && drag.over === index && drag.from !== index}
            pointer={handlers}
            onMove={(to) => move(index, to)}
            onRemove={() => removeFromBlog(photo.id)}
          />
        ))}
        {pending.map((photo, index) => (
          <PendingThumb
            key={photo.uploadId}
            photo={photo}
            number={photos.length + index + 1}
            onRetry={() => retry(photo.uploadId)}
            onRemove={() => removeWaiting(photo.uploadId)}
          />
        ))}
      </ul>
      {message && <Toast message={message} onDismiss={clearMessage} />}
    </section>
  );
}
