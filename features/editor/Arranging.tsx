'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { nameLocations, reportCreateProgress, writeCaptions } from './arrangeActions';
import { arrangeQuest, type ArrangeStep } from './arrangeQuest';
import { withCaptions } from './captionTargets';
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

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p role="status" className="text-lead text-ink">
        {failed ? FALLBACK : LINES[step]}
      </p>
    </main>
  );
}
