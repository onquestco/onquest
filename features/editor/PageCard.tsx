'use client';

import { useState } from 'react';
import type { QuestDocument } from '@/lib/trip/schema';
import { formatDateRange } from '@/lib/dates';
import { PHOTOS_PER_PAGE } from '@/lib/trip/limits';

type Page = QuestDocument['content']['days'][number];

type Props = {
  page: Page;
  number: number;
  previews: Record<string, string>;
  undated: Set<string>;
  onRename: (title: string) => void;
  onOpenPhoto: (photoId: string) => void;
  onAddHere: () => void;
};

export function PageCard({ page, number, previews, undated, onRename, onOpenPhoto, onAddHere }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title ?? '');
  const empty = PHOTOS_PER_PAGE - page.photoIds.length;

  return (
    <section aria-label={`Page ${number}`} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <header className="flex items-start justify-between gap-2">
        {editing ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onRename(title);
              setEditing(false);
            }}
          >
            <input
              autoFocus
              aria-label={`Title of page ${number}`}
              maxLength={40}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-sm border border-line-control px-3 text-body text-ink"
            />
            <button type="submit" className="min-h-11 rounded-pill px-3 text-label font-semibold text-brand-strong">
              Done
            </button>
          </form>
        ) : (
          <div className="min-w-0">
            <h2 className="truncate text-body font-semibold text-ink">{page.title || `Page ${number}`}</h2>
            {page.startDate && (
              <p className="text-caption text-ink-muted">{formatDateRange(page.startDate, page.endDate)}</p>
            )}
          </div>
        )}
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setTitle(page.title ?? '');
              setEditing(true);
            }}
            className="min-h-11 shrink-0 rounded-pill px-3 text-label text-brand-strong"
            aria-label={`Rename page ${number}`}
          >
            Rename
          </button>
        )}
      </header>

      <ul className="grid grid-cols-3 gap-2">
        {page.photoIds.map((photoId, index) => (
          <li key={photoId} className="relative aspect-square">
            <button
              type="button"
              onClick={() => onOpenPhoto(photoId)}
              aria-label={`Photo ${index + 1} on page ${number}${undated.has(photoId) ? ', no date' : ''}`}
              className="block h-full w-full overflow-hidden rounded-sm bg-surface-page focus-visible:outline-2 focus-visible:outline-brand-strong"
            >
              <img src={previews[photoId]} alt="" className="h-full w-full object-cover" />
            </button>
            {undated.has(photoId) && (
              <span aria-hidden className="absolute top-1 left-1 size-3 rounded-pill border border-line-control bg-surface" />
            )}
          </li>
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <li key={`empty-${index}`} className="aspect-square">
            <button
              type="button"
              onClick={onAddHere}
              aria-label={`Add a photo to page ${number}`}
              className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-line-control text-title text-ink-muted"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
