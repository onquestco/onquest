'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { PinIcon } from '@/design-system/components/icons';
import type { GeoPlace } from '@/lib/geo';
import { applyPlaces } from './applyPlaces';
import { searchPlaces, writeCaptions } from './arrangeActions';
import { withCaptions } from './captionTargets';
import { saveDraftNow } from './draftSaver';
import { useDraft } from './draftStore';
import { defaultQuestTitle } from './pageTitle';

/**
 * "Where was this trip?" on Review when no place was found (decision 0003): phone browsers strip
 * photo GPS and the photos didn't give the town away. One town names every page and gets the
 * captions written.
 */
export function TownBox({ tripKey }: { tripKey: string }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<GeoPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function search() {
    if (text.trim().length < 2) return;
    setBusy(true);
    setMessage(undefined);
    const result = await searchPlaces({ key: tripKey, text: text.trim() }).catch(() => null);
    setBusy(false);
    if (!result?.ok || !result.data.found) return setMessage("Couldn't search right now. Try again.");
    setResults(result.data.places);
    if (result.data.places.length === 0) setMessage('No town by that name. Try another spelling.');
  }

  async function choose(town: GeoPlace) {
    const { document, apply } = useDraft.getState();
    if (!document) return;
    setBusy(true);
    const everyPhoto = [{ lat: town.lat, lng: town.lng, photoIds: document.photos.map((photo) => photo.id) }];
    // Only an automatic title follows the town; one the traveller typed stays.
    const automatic =
      document.title === defaultQuestTitle(document.photos.map((photo) => ({ date: photo.date })));
    apply(applyPlaces(document, everyPhoto, [town], () => crypto.randomUUID(), automatic));

    // Autosave may already have saved the change ('unchanged'): captions go ahead either way.
    const outcome = await saveDraftNow();
    if (outcome === 'saved' || outcome === 'unchanged') {
      const { savedAt } = useDraft.getState();
      const written = savedAt
        ? await writeCaptions({ key: tripKey, basedOn: savedAt }).catch(() => null)
        : null;
      if (written?.ok && written.data.written && written.data.captions.length > 0) {
        const state = useDraft.getState();
        if (state.document) state.setDocument(withCaptions(state.document, written.data.captions));
        useDraft.getState().markSaved(written.data.savedAt, useDraft.getState().version);
      }
    }
    setBusy(false);
  }

  return (
    <section
      aria-label="Where was this trip?"
      className="flex flex-col gap-2 rounded-md border border-dashed border-brand-strong bg-brand-wash p-4"
    >
      <h2 className="text-body font-bold text-ink">Where was this trip?</h2>
      <p className="text-label font-normal text-ink-muted">
        Add the town and we&apos;ll name your pages and write the captions.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="sr-only" htmlFor="town">
          Town or city
        </label>
        <input
          id="town"
          value={text}
          maxLength={100}
          placeholder="Mumbai, Goa, Manali…"
          onChange={(event) => setText(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-pill border border-line-control bg-surface px-4 text-body text-ink placeholder:text-ink-subtle focus:border-brand-strong focus:outline-2 focus:outline-brand-strong"
        />
        <Button type="submit" className="min-h-11 px-4.5 py-2" disabled={busy || text.trim().length < 2}>
          {busy ? '…' : 'Find'}
        </Button>
      </form>
      {results && results.length > 0 && (
        <ul className="flex flex-col">
          {results.map((town) => (
            <li key={`${town.name}-${town.lat}-${town.lng}`}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void choose(town)}
                className="flex min-h-11 w-full items-center gap-2 text-left text-body text-ink"
              >
                <span className="text-brand-strong">
                  <PinIcon />
                </span>
                <span className="font-semibold">{town.name}</span>
                {town.detail && (
                  <span className="truncate text-label font-normal text-ink-muted">{town.detail}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p role="status" className="text-label font-normal text-ink-muted">
          {message}
        </p>
      )}
    </section>
  );
}
