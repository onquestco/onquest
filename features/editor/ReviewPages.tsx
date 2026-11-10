'use client';

import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { Toast } from '@/design-system/components/Toast';
import { MAX_PHOTOS } from '@/lib/trip/limits';
import type { QuestDocument } from '@/lib/trip/schema';
import { useDraft } from './draftStore';
import { MoveSheet } from './MoveSheet';
import { PageCard } from './PageCard';
import {
  addPhotos,
  movePhoto,
  removePhoto,
  renamePage,
  replacePhoto,
  setCaption,
  setPhotoDate,
  startNewPage,
  swapPhotos,
  type EditResult,
} from './pageEdits';
import { PhotoSheet } from './PhotoSheet';
import { readPhotos } from './readPhotos';

type Notice = { message: string; undo?: boolean };

/** Screen 5. The draft is ready to publish as is; every edit here is optional and undoable. */
export function ReviewPages({ tripKey }: { tripKey: string }) {
  const { key, document, previews, apply, undo, addPreviews, setDocument } = useDraft();
  const [openPhoto, setOpenPhoto] = useState<string>();
  const [moving, setMoving] = useState<string>();
  const [notice, setNotice] = useState<Notice>();

  if (key !== tripKey || !document) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-body text-ink">This Quest isn&apos;t on this device any more. Start again from your photos.</p>
        <Link href="/quests/new" className={buttonClassName()}>
          Pick photos
        </Link>
      </main>
    );
  }
  const current = document;

  function change(result: EditResult | QuestDocument, message: string) {
    if ('ok' in result && !result.ok) return setNotice({ message: result.reason });
    apply('ok' in result ? result.document : result);
    setNotice({ message, undo: true });
  }

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const read = await readPhotos(Array.from(event.target.files ?? []));
    event.target.value = '';
    addPreviews(read);
    const photos = read.map(({ id, width, height }) => ({ id, width, height }));
    const result = addPhotos(current, photos, () => crypto.randomUUID(), MAX_PHOTOS);
    if (result.added < read.length) setNotice({ message: `A Quest holds ${MAX_PHOTOS} photos. Remove one to add another.` });
    if (result.added > 0) change(result.document, result.added === 1 ? 'Photo added.' : `${result.added} photos added.`);
  }

  async function replace(oldId: string, files: File[]) {
    const [photo] = await readPhotos(files.slice(0, 1));
    if (!photo) return setNotice({ message: "That photo couldn't be read." });
    addPreviews([photo]);
    setOpenPhoto(undefined);
    change(replacePhoto(current, oldId, { id: photo.id, width: photo.width, height: photo.height }), 'Photo replaced.');
  }

  const total = current.photos.length;
  const undated = new Set(current.photos.filter((photo) => !photo.date).map((photo) => photo.id));
  const photo = current.photos.find((candidate) => candidate.id === openPhoto);

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-surface-page px-4 pt-6 pb-28">
      <label className="flex flex-col gap-1 text-label text-ink-muted">
        Title
        <input
          maxLength={60}
          value={current.title ?? ''}
          onChange={(event) => setDocument({ ...current, title: event.target.value })}
          className="min-h-12 rounded-sm border border-line-control bg-surface px-3 text-title text-ink"
        />
      </label>

      {current.content.days.map((page, index) => (
        <PageCard
          key={page.id}
          page={page}
          number={index + 1}
          previews={previews}
          undated={undated}
          onRename={(title) => apply(renamePage(current, index, title))}
          onOpenPhoto={setOpenPhoto}
          onAddHere={() => window.document.getElementById('add-photos')?.click()}
        />
      ))}

      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-pill border border-dashed border-line-control px-6 py-3 text-body font-semibold text-brand-strong has-focus-visible:outline-2 has-focus-visible:outline-brand-strong">
        + Add photos · {total} of {MAX_PHOTOS}
        <input id="add-photos" type="file" accept="image/*" multiple onChange={add} disabled={total >= MAX_PHOTOS} className="sr-only" />
      </label>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-4">
        <div className="mx-auto max-w-lg">
          <Link href={`/quests/${tripKey}/template`} className={buttonClassName({ block: true })}>
            Choose a template
          </Link>
        </div>
      </div>

      {photo && !moving && (
        <PhotoSheet
          key={photo.id}
          photo={photo}
          previewUrl={previews[photo.id]}
          onClose={() => setOpenPhoto(undefined)}
          onCaption={(caption) => apply(setCaption(current, photo.id, caption))}
          onDate={(date) => apply(setPhotoDate(current, photo.id, date))}
          onMove={() => setMoving(photo.id)}
          onReplace={(files) => void replace(photo.id, files)}
          onRemove={() => {
            const result = removePhoto(current, photo.id);
            if (result.ok) setOpenPhoto(undefined);
            change(result, 'Photo removed.');
          }}
        />
      )}

      {moving && (
        <MoveSheet
          document={current}
          photoId={moving}
          previews={previews}
          onClose={() => setMoving(undefined)}
          onMove={(pageIndex) => {
            change(movePhoto(current, moving, pageIndex), 'Photo moved.');
            setMoving(undefined);
            setOpenPhoto(undefined);
          }}
          onSwap={(otherId) => {
            change(swapPhotos(current, moving, otherId), 'Photos swapped.');
            setMoving(undefined);
            setOpenPhoto(undefined);
          }}
          onNewPage={() => {
            change(startNewPage(current, moving, crypto.randomUUID()), 'New page started.');
            setMoving(undefined);
            setOpenPhoto(undefined);
          }}
        />
      )}

      {notice && (
        <Toast
          message={notice.message}
          actionLabel={notice.undo ? 'Undo' : undefined}
          onAction={undo}
          onDismiss={() => setNotice(undefined)}
        />
      )}
    </main>
  );
}
