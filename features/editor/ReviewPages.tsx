'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { Toast } from '@/design-system/components/Toast';
import { TopBar } from '@/design-system/components/TopBar';
import { MAX_PHOTOS } from '@/lib/trip/limits';
import type { QuestDocument } from '@/lib/trip/schema';
import { useDraft } from './draftStore';
import { SaveStatusLine } from './EditorDraft';
import { LostDraft } from './LostDraft';
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
import { reportEdit, reportPhotoLimit } from './reportEdit';
import type { QuestEdit } from './createFlowProperties';

type Notice = { message: string; undo?: boolean };
/** Which edit a change is, for quest_edit. */
type EditInfo = Pick<QuestEdit, 'action' | 'photoId' | 'pageIndex'> & { before?: QuestDocument };

/** Screen 5. The draft is ready to publish as is; every edit here is optional and undoable. */
export function ReviewPages({ tripKey }: { tripKey: string }) {
  const { key, photoFolder, document, previews, apply, undo, addPreviews, setDocument } = useDraft();
  const [openPhoto, setOpenPhoto] = useState<string>();
  const [moving, setMoving] = useState<string>();
  const [notice, setNotice] = useState<Notice>();
  // The title when its field got focus: quest_edit fires once on leaving the field, not per key.
  const titleOnFocus = useRef<string | undefined>(undefined);

  if (key !== tripKey || !document || !photoFolder) {
    return <LostDraft />;
  }
  const current = document;
  const folder = photoFolder;

  function change(result: EditResult | QuestDocument, message: string, edit: EditInfo) {
    const before = edit.before ?? current;
    if ('ok' in result && !result.ok) {
      reportEdit({ ...edit, before }, result.reason);
      return setNotice({ message: result.reason });
    }
    const after = 'ok' in result ? result.document : result;
    apply(after);
    reportEdit({ ...edit, before, after });
    setNotice({ message, undo: true });
  }

  /** An edit straight from a sheet or a page card (no notice): applied, then reported. */
  function applyEdit(after: QuestDocument, edit: EditInfo) {
    apply(after);
    reportEdit({ ...edit, before: current, after });
  }

  function undoLast() {
    const { document: before, history } = useDraft.getState();
    if (!before || history.length === 0) return;
    undo();
    reportEdit({ action: 'undo', before, after: useDraft.getState().document ?? before });
  }

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setNotice({ message: files.length === 1 ? 'Adding your photo…' : 'Adding your photos…' });
    const read = await readPhotos(files, folder);
    if (read.length < files.length) setNotice({ message: "Some photos couldn't be added. Try again." });
    addPreviews(read);
    const photos = read.map(({ id, width, height }) => ({ id, width, height }));
    // Uploading takes a while: add to the document as it is now, not as it was on tap.
    const latest = useDraft.getState().document ?? current;
    const result = addPhotos(latest, photos, () => crypto.randomUUID(), MAX_PHOTOS);
    if (result.added < read.length) {
      setNotice({ message: `A Quest holds ${MAX_PHOTOS} photos. Remove one to add another.` });
      reportPhotoLimit();
    }
    if (result.added > 0)
      change(result.document, result.added === 1 ? 'Photo added.' : `${result.added} photos added.`, {
        action: 'add_photos',
        photoId: photos[0]?.id,
        before: latest,
      });
    else if (read.length > 0) reportEdit({ action: 'add_photos', before: latest });
  }

  async function replace(oldId: string, files: File[]) {
    const [photo] = await readPhotos(files.slice(0, 1), folder);
    if (!photo) return setNotice({ message: "That photo couldn't be read." });
    addPreviews([photo]);
    setOpenPhoto(undefined);
    const before = useDraft.getState().document ?? current;
    change(
      replacePhoto(before, oldId, { id: photo.id, width: photo.width, height: photo.height }),
      'Photo replaced.',
      { action: 'replace_photo', photoId: photo.id, before },
    );
  }

  const total = current.photos.length;
  const captions = Object.fromEntries(current.photos.map((photo) => [photo.id, photo.caption ?? '']));
  const undated = new Set(current.photos.filter((photo) => !photo.date).map((photo) => photo.id));
  const photo = current.photos.find((candidate) => candidate.id === openPhoto);

  return (
    <>
      <TopBar title="Review" href="/quests" fallback="/quests" />
      <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-surface-page px-4 pt-4 pb-28">
        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-label text-ink-muted">
            Quest title
            <span className="font-normal">{(current.title ?? '').length}/60</span>
          </span>
          <input
            maxLength={60}
            value={current.title ?? ''}
            onChange={(event) => setDocument({ ...current, title: event.target.value })}
            onFocus={() => {
              titleOnFocus.current = current.title ?? '';
            }}
            onBlur={() => {
              const before = titleOnFocus.current;
              titleOnFocus.current = undefined;
              if (before === undefined || before === (current.title ?? '')) return;
              reportEdit({ action: 'title', before: { ...current, title: before }, after: current });
            }}
            className="min-h-12 rounded-sm border border-line-control bg-surface px-3 text-body text-ink focus:border-brand-strong focus:outline-2 focus:outline-brand-strong"
          />
        </label>
        <p className="text-label font-normal text-ink-muted">
          Ready to publish as it is. Each photo gets its own caption, written from its date and place when the
          photo has them. Tap a caption or photo to change it.
        </p>
        <SaveStatusLine />

        {current.content.days.map((page, index) => (
          <PageCard
            key={page.id}
            page={page}
            number={index + 1}
            previews={previews}
            captions={captions}
            undated={undated}
            onRename={(title) =>
              title === (page.title ?? '')
                ? apply(renamePage(current, index, title))
                : applyEdit(renamePage(current, index, title), { action: 'rename_page', pageIndex: index })
            }
            onOpenPhoto={setOpenPhoto}
            onAddHere={() => window.document.getElementById('add-photos')?.click()}
          />
        ))}

        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-line-control bg-surface px-6 py-3 text-body font-semibold text-ink has-focus-visible:outline-2 has-focus-visible:outline-brand-strong">
          + Add photos
          <span className="font-medium text-ink-muted">
            {total} of {MAX_PHOTOS}
          </span>
          <input
            id="add-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={add}
            disabled={total >= MAX_PHOTOS}
            className="sr-only"
          />
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
            onCaption={(caption) =>
              applyEdit(setCaption(current, photo.id, caption), { action: 'caption', photoId: photo.id })
            }
            onDate={(date) =>
              applyEdit(setPhotoDate(current, photo.id, date), { action: 'date', photoId: photo.id })
            }
            onMove={() => setMoving(photo.id)}
            onReplace={(files) => void replace(photo.id, files)}
            onRemove={() => {
              const result = removePhoto(current, photo.id);
              if (result.ok) setOpenPhoto(undefined);
              change(result, 'Photo removed.', { action: 'remove_photo', photoId: photo.id });
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
              change(movePhoto(current, moving, pageIndex), 'Photo moved.', {
                action: 'move_photo',
                photoId: moving,
                pageIndex,
              });
              setMoving(undefined);
              setOpenPhoto(undefined);
            }}
            onSwap={(otherId) => {
              change(swapPhotos(current, moving, otherId), 'Photos swapped.', {
                action: 'swap_photos',
                photoId: moving,
              });
              setMoving(undefined);
              setOpenPhoto(undefined);
            }}
            onNewPage={() => {
              change(startNewPage(current, moving, crypto.randomUUID()), 'New page started.', {
                action: 'new_page',
                photoId: moving,
              });
              setMoving(undefined);
              setOpenPhoto(undefined);
            }}
          />
        )}

        {notice && (
          <Toast
            message={notice.message}
            actionLabel={notice.undo ? 'Undo' : undefined}
            onAction={undoLast}
            onDismiss={() => setNotice(undefined)}
          />
        )}
      </main>
    </>
  );
}
