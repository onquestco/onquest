'use client';

import { useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/design-system/components/Button';
import { PinIcon } from '@/design-system/components/icons';
import { Sheet } from '@/design-system/components/Sheet';
import { TextField } from '@/design-system/components/TextField';
import type { GeoPlace } from '@/lib/geo';
import { searchBlogPlaces } from './actions';
import type { BlogDraftSaver } from './blogDraftSaver';
import type { BlogDraftStore } from './blogDraftStore';
import { toBlogPlace } from './blogPlace';

const SEARCH_FAILED = "Couldn't search. Check your connection and try again.";

/** "Add a place" (S1): a town or region the writer picks, so the blog shows up when people search it. */
export function PlaceRow({ store, saver }: { store: BlogDraftStore; saver: BlogDraftSaver }) {
  const place = useStore(store, (state) => state.document.place);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-strong"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-wash text-brand-strong">
          <PinIcon size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{place ? place.name : 'Add a place'}</span>
        {place && <span className="shrink-0 text-label font-semibold text-brand-strong">Change</span>}
      </button>
      {open && <PlaceSheet store={store} saver={saver} onClose={() => setOpen(false)} />}
    </>
  );
}

function PlaceSheet({ store, saver, onClose }: { store: BlogDraftStore; saver: BlogDraftSaver; onClose: () => void }) {
  const place = useStore(store, (state) => state.document.place);
  const [text, setText] = useState('');
  const [results, setResults] = useState<GeoPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function search(event: FormEvent) {
    event.preventDefault();
    if (text.trim().length < 2) return;
    setBusy(true);
    setError(undefined);
    // The search checks the blog is the writer's, so its rows must exist first.
    const saved = await saver.saveNow({ force: store.getState().draftSavedAt === null });
    const result =
      saved === 'offline' ? null : await searchBlogPlaces({ key: store.getState().key, text: text.trim() }).catch(() => null);
    setBusy(false);
    if (!result?.ok || !result.data.found) {
      setResults(null);
      setError(SEARCH_FAILED);
      return;
    }
    setResults(result.data.places);
  }

  function choose(geo: GeoPlace) {
    store.getState().change({ place: toBlogPlace(geo) });
    onClose();
  }

  return (
    <Sheet open title="Add a place" onClose={onClose}>
      <form onSubmit={(event) => void search(event)} className="flex flex-col gap-3">
        <TextField
          label="Town or region"
          value={text}
          maxLength={60}
          enterKeyHint="search"
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" variant="secondary" block disabled={busy || text.trim().length < 2}>
          {busy ? 'Searching…' : 'Search'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
      {results && results.length === 0 && <p className="text-body text-ink-muted">No places found. Try another name.</p>}
      {results && results.length > 0 && (
        <ul className="flex flex-col">
          {results.map((geo, index) => (
            <li key={`${geo.geoRef ?? geo.name}-${index}`}>
              <button
                type="button"
                onClick={() => choose(geo)}
                className="flex min-h-12 w-full flex-col justify-center border-b border-line py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-strong"
              >
                <span className="text-body font-semibold text-ink">{geo.name}</span>
                {geo.detail && <span className="text-label font-normal text-ink-muted">{geo.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {place && (
        <Button
          variant="quiet"
          block
          onClick={() => {
            store.getState().change({ place: undefined });
            onClose();
          }}
        >
          Remove {place.name}
        </Button>
      )}
    </Sheet>
  );
}
