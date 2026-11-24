'use client';

import { useState, type ChangeEvent, type PointerEvent } from 'react';
import { useStore } from 'zustand';
import { PlusIcon } from '@/design-system/components/icons';
import { Toast } from '@/design-system/components/Toast';
import { BLOG_MAX_PHOTOS } from '@/lib/blog/limits';
import { photoUrls } from '@/lib/storage';
import type { BlogDraftStore } from './blogDraftStore';
import { PendingThumb, PhotoThumb } from './PhotoThumb';
import { useBlogPhotos } from './useBlogPhotos';

// "+ Add photos", then square thumbnails (PRD B2): drag one to reorder (the first is the cover),
// × to remove, "4 of 10". Dragging uses pointer events, so it works with a finger or a mouse; the
// move buttons on each photo do the same for keyboards and screen readers.

type Drag = { from: number; over: number; pointerId: number };

export function PhotoRow({ store }: { store: BlogDraftStore }) {
  const photos = useStore(store, (state) => state.document.photos);
  const pending = useStore(store, (state) => state.pending);
  const previews = useStore(store, (state) => state.previews);
  const folder = useStore(store, (state) => state.photoFolder);
  const { add, retry, removeWaiting, removeFromBlog, move, message, clearMessage } = useBlogPhotos(store);
  const [drag, setDrag] = useState<Drag | null>(null);
  const count = photos.length + pending.length;

  function choose(event: ChangeEvent<HTMLInputElement>) {
    add(Array.from(event.target.files ?? []));
    event.target.value = ''; // so the same photo can be picked again after removing it
  }

  function indexUnder(event: PointerEvent): number | null {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-photo-index]');
    const index = element instanceof HTMLElement ? Number(element.dataset.photoIndex) : Number.NaN;
    return Number.isNaN(index) ? null : index;
  }

  function startDrag(event: PointerEvent<HTMLLIElement>, index: number) {
    // The × and move buttons are taps, not drags.
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ from: index, over: index, pointerId: event.pointerId });
  }

  function moveDrag(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const over = indexUnder(event);
    if (over !== null && over !== drag.over) setDrag({ ...drag, over });
  }

  function endDrag(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.over !== drag.from) move(drag.from, drag.over);
    setDrag(null);
  }

  return (
    <section aria-label="Photos" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-label text-ink-muted">Photos</h2>
        <span aria-live="polite" className="rounded-pill bg-brand-wash px-3 py-1 text-caption font-semibold text-ink">
          {count} of {BLOG_MAX_PHOTOS}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2">
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
            onPointerDown={(event) => startDrag(event, index)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => setDrag(null)}
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
