'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Contour } from '@/design-system/components/Contour';
import { describeQuest, nameLocations, reportCreateProgress, writeCaptions } from './arrangeActions';
import { arrangeQuest, type ArrangeStep } from './arrangeQuest';
import { withCaptions } from './captionTargets';
import { buildCollage } from './collage';
import { saveDraftNow } from './draftSaver';
import { useDraft } from './draftStore';
import { LostDraft } from './LostDraft';

// Screen 4. One line changes as work happens; never a bare spinner. Any failure still ends on
// Review with the photos in pick order and the fallback message.

const LINES: Record<ArrangeStep, string> = {
  sorting: 'Sorting by day…',
  places: 'Finding places…',
  captions: 'Writing captions…',
};
const FALLBACK = "We couldn't arrange this automatically. Your photos are in the order you picked them.";
const FALLBACK_SHOW_MS = 2500;
const STEPS: ArrangeStep[] = ['sorting', 'places', 'captions'];

type Props = { tripKey: string; arrangedBefore: boolean };

export function Arranging({ tripKey, arrangedBefore }: Props) {
  const router = useRouter();
  const known = useDraft((state) => state.key === tripKey && state.picked.length > 0);
  const [step, setStep] = useState<ArrangeStep>('sorting');
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // A reload here after the draft was arranged: carry on editing it.
    if (!known && arrangedBefore) router.replace(`/quests/${tripKey}/review`);
  }, [known, arrangedBefore, router, tripKey]);

  useEffect(() => {
    if (!known || started.current) return;
    started.current = true;
    const began = Date.now();
    const { picked, startedAt, setDocument } = useDraft.getState();

    void arrangeQuest(picked, startedAt, {
      createId: () => crypto.randomUUID(),
      onStep: setStep,
      async nameLocations(points) {
        const result = await nameLocations({ key: tripKey, points });
        return result.ok && result.data.named ? result.data.places : null;
      },
      async save(document) {
        setDocument(document);
        return (await saveDraftNow()) === 'saved';
      },
      async describe() {
        const { savedAt, document, previews } = useDraft.getState();
        if (!savedAt || !document) return null;
        const tiles = document.photos.filter((photo) => previews[photo.id]).slice(0, 15);
        const collage = await buildCollage(tiles.map((photo) => previews[photo.id] ?? ''));
        if (!collage) return null;
        const result = await describeQuest({
          key: tripKey,
          basedOn: savedAt,
          photoIds: tiles.map((photo) => photo.id),
          collage,
        });
        if (!result.ok || !result.data.written || !result.data.document) return null;
        // The server saved the town and captions into the draft: take them and its saved_at.
        const written = result.data.document;
        useDraft.getState().setDocument(written);
        useDraft.getState().markSaved(result.data.savedAt, useDraft.getState().version);
        return written.photos.flatMap((photo) =>
          photo.caption && photo.captionSource === 'auto'
            ? [{ photoId: photo.id, caption: photo.caption }]
            : [],
        );
      },
      async writeCaptions() {
        const { savedAt } = useDraft.getState();
        if (!savedAt) return [];
        const result = await writeCaptions({ key: tripKey, basedOn: savedAt });
        if (!result.ok || !result.data.written || result.data.captions.length === 0) return [];
        // The server saved the captions into the draft: take them and its new saved_at.
        const state = useDraft.getState();
        if (state.document) state.setDocument(withCaptions(state.document, result.data.captions));
        useDraft.getState().markSaved(result.data.savedAt, useDraft.getState().version);
        return result.data.captions;
      },
    }).then(async (result) => {
      const document = useDraft.getState().document ?? result.document;
      void reportCreateProgress({
        key: tripKey,
        arranged: {
          pages: document.content.days.length,
          photos: document.photos.length,
          captionsWritten: result.captions.length,
          fallbackUsed: result.fallbackUsed,
          failed: result.failed,
          durationMs: Date.now() - began,
        },
      }).catch(() => undefined);
      if (result.failed) {
        setFailed(true);
        await new Promise((resolve) => setTimeout(resolve, FALLBACK_SHOW_MS));
      }
      router.replace(`/quests/${tripKey}/review`);
    });
  }, [known, router, tripKey]);

  if (!known) return arrangedBefore ? null : <LostDraft />;

  const done = STEPS.indexOf(step);
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-surface px-6 text-center">
      <Contour />
      <PhotoPiles />
      <h1 className="relative text-title text-ink">Arranging your Quest</h1>
      <div className="relative h-1.5 w-60 overflow-hidden rounded-pill bg-line">
        <div
          className="h-full bg-brand-strong transition-all duration-700 motion-reduce:transition-none"
          style={{ width: `${((done + 1) / (STEPS.length + 1)) * 100}%` }}
        />
      </div>
      {failed ? (
        <p role="status" className="relative max-w-xs text-body text-ink">
          {FALLBACK}
        </p>
      ) : (
        <ol role="status" className="relative flex flex-col gap-3 text-left text-body">
          {STEPS.map((name, index) => (
            <li
              key={name}
              className={`flex items-center gap-3 ${
                index < done ? 'text-ink' : index === done ? 'font-semibold text-ink' : 'text-ink-subtle'
              }`}
            >
              <span className="w-5 text-center font-semibold text-brand-strong" aria-hidden>
                {index < done ? '✓' : index === done ? '•' : '○'}
              </span>
              {LINES[name]}
            </li>
          ))}
        </ol>
      )}
      <p className="relative max-w-xs text-label font-normal text-ink-muted">
        Under a minute. You can change anything after.
      </p>
    </main>
  );
}

/** The picked photos flying into up to 5 page piles of 3 (the prototype's arranging moment). */
function PhotoPiles() {
  const picked = useDraft((state) => state.picked);
  const piles = Array.from({ length: Math.min(5, Math.ceil(picked.length / 3)) }, (_, pile) =>
    picked.slice(pile * 3, pile * 3 + 3),
  );
  return (
    <div aria-hidden className="relative flex h-24 justify-center gap-3">
      {piles.map((photos, pile) => (
        <div key={pile} className="relative h-18 w-15 rounded-sm border border-dashed border-brand-tint">
          {photos.map((photo, index) => (
            <img
              key={photo.id}
              src={photo.previewUrl}
              alt=""
              className="absolute inset-1 h-16 w-13 animate-oq-fly border-2 border-surface object-cover shadow-photo"
              style={{
                animationDelay: `${(pile * 3 + index) * 140}ms`,
                rotate: `${(index - 1) * 7}deg`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
