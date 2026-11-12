'use client';

import { useState } from 'react';
import { PencilIcon } from '@/design-system/components/icons';
import type { QuestDocument } from '@/lib/trip/schema';
import { formatDateRange } from '@/lib/dates';
import { PHOTOS_PER_PAGE } from '@/lib/trip/limits';

type Page = QuestDocument['content']['days'][number];

type Props = {
  page: Page;
  number: number;
  previews: Record<string, string>;
  /** Each photo's caption ('' when it has none). */
  captions: Record<string, string>;
  undated: Set<string>;
  onRename: (title: string) => void;
  onOpenPhoto: (photoId: string) => void;
  onAddHere: () => void;
};

/** One page on Review, as in the prototype: "Day 1 · Panjim ✎", its date, photos with captions. */
export function PageCard({
  page,
  number,
  previews,
  captions,
  undated,
  onRename,
  onOpenPhoto,
  onAddHere,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title ?? '');
  const empty = PHOTOS_PER_PAGE - page.photoIds.length;
  const shownTitle = page.title || `Page ${number}`;

  return (
    <section
      aria-label={shownTitle}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4"
    >
      <header className="flex flex-col gap-1">
        {editing ? (
          <form
            className="flex gap-2"
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
            <button
              type="submit"
              className="min-h-11 rounded-pill px-3 text-label font-semibold text-brand-strong"
            >
              Done
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitle(page.title ?? '');
              setEditing(true);
            }}
            aria-label={`Rename ${shownTitle}`}
            className="flex min-h-8 items-center gap-1.5 self-start text-left text-body font-bold text-ink"
          >
            <span className="truncate">{shownTitle}</span>
            <PencilIcon size={14} />
          </button>
        )}
        {page.startDate && (
          <p className="text-label font-normal text-ink-muted">
            {formatDateRange(page.startDate, page.endDate)}
          </p>
        )}
      </header>

      <ul className="grid grid-cols-3 gap-2.5">
        {page.photoIds.map((photoId, index) => (
          <li key={photoId} className="flex flex-col gap-1.5">
            <div className="relative aspect-square">
              <button
                type="button"
                onClick={() => onOpenPhoto(photoId)}
                aria-label={`Photo ${index + 1} on ${shownTitle}${undated.has(photoId) ? ', no date' : ''}`}
                className="block h-full w-full overflow-hidden bg-surface-page focus-visible:outline-2 focus-visible:outline-brand-strong"
              >
                <img src={previews[photoId]} alt="" className="h-full w-full object-cover" />
              </button>
              {undated.has(photoId) && (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 size-2.5 rounded-pill border border-line-control bg-surface"
                />
              )}
            </div>
            {/* The caption under the photo; tapping it opens the photo's sheet, where it's edited. */}
            <button
              type="button"
              onClick={() => onOpenPhoto(photoId)}
              aria-label={captions[photoId] ? `Edit caption: ${captions[photoId]}` : 'Add a caption'}
              className={`line-clamp-2 text-left text-caption ${
                captions[photoId] ? 'text-ink-muted italic' : 'font-semibold text-brand-strong'
              }`}
            >
              {captions[photoId] || '+ Caption'}
            </button>
          </li>
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <li key={`empty-${index}`} className="aspect-square">
            <button
              type="button"
              onClick={onAddHere}
              aria-label={`Add a photo to ${shownTitle}`}
              className="flex h-full w-full items-center justify-center border border-dashed border-line-control text-title text-ink-muted"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
