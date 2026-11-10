'use client';

import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { MAX_PAGES, PHOTOS_PER_PAGE } from '@/lib/trip/limits';
import type { QuestDocument } from '@/lib/trip/schema';

type Props = {
  document: QuestDocument;
  photoId: string;
  previews: Record<string, string>;
  onClose: () => void;
  onMove: (pageIndex: number) => void;
  onSwap: (otherPhotoId: string) => void;
  onNewPage: () => void;
};

/** A page with room takes the photo; on a full page, tapping one of its photos swaps the two. */
export function MoveSheet({ document, photoId, previews, onClose, onMove, onSwap, onNewPage }: Props) {
  const pages = document.content.days;
  return (
    <Sheet open title="Move to another page" onClose={onClose}>
      <ul className="flex flex-col gap-3">
        {pages.map((page, index) => {
          if (page.photoIds.includes(photoId)) return null;
          const full = page.photoIds.length >= PHOTOS_PER_PAGE;
          return (
            <li key={page.id} className="flex flex-col gap-2 rounded-sm border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-semibold text-ink">{page.title || `Page ${index + 1}`}</span>
                {!full && (
                  <Button variant="quiet" onClick={() => onMove(index)}>
                    Move here
                  </Button>
                )}
              </div>
              {full && (
                <>
                  <p className="text-caption text-ink-muted">Full. Tap a photo to swap it with this one.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {page.photoIds.map((otherId, photoIndex) => (
                      <button
                        key={otherId}
                        type="button"
                        onClick={() => onSwap(otherId)}
                        aria-label={`Swap with photo ${photoIndex + 1} on ${page.title || `page ${index + 1}`}`}
                        className="aspect-square overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-brand-strong"
                      >
                        <img src={previews[otherId]} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {pages.length < MAX_PAGES && (
        <Button variant="secondary" block onClick={onNewPage}>
          Start a new page with it
        </Button>
      )}
    </Sheet>
  );
}
