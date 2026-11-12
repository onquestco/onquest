'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { TextField } from '@/design-system/components/TextField';
import { formatDateRange } from '@/lib/dates';
import { CAPTION_MAX } from '@/lib/trip/limits';
import type { TripPhoto } from '@/lib/trip/schema';

type Props = {
  photo: TripPhoto;
  previewUrl?: string;
  placeName?: string;
  onClose: () => void;
  onCaption: (caption: string) => void;
  onDate: (date: string | undefined) => void;
  onMove: () => void;
  onReplace: (files: File[]) => void;
  onRemove: () => void;
};

/** Tap a photo on Review pages: caption, a quiet date-and-place row, then three actions. */
export function PhotoSheet({
  photo,
  previewUrl,
  placeName,
  onClose,
  onCaption,
  onDate,
  onMove,
  onReplace,
  onRemove,
}: Props) {
  const [caption, setCaption] = useState(photo.caption ?? '');
  const [editingDate, setEditingDate] = useState(false);
  const when = photo.date ? formatDateRange(photo.date) : undefined;
  const row = [when, placeName].filter(Boolean).join(' · ');

  function close() {
    if (caption !== (photo.caption ?? '')) onCaption(caption);
    onClose();
  }

  return (
    <Sheet open title="Photo" onClose={close}>
      {previewUrl && <img src={previewUrl} alt="" className="max-h-64 w-full rounded-sm object-contain" />}

      <TextField
        label="Caption"
        maxLength={CAPTION_MAX}
        showCount
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        onBlur={() => caption !== (photo.caption ?? '') && onCaption(caption)}
      />

      {editingDate ? (
        <label className="flex flex-col gap-1 text-label text-ink-muted">
          Date
          <input
            type="date"
            defaultValue={photo.date}
            onChange={(event) => onDate(event.target.value || undefined)}
            className="min-h-12 rounded-sm border border-line-control px-3 text-body text-ink"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setEditingDate(true)}
          className="flex min-h-11 items-center justify-between text-left text-label text-ink-muted"
        >
          <span>{row || 'No date or place'}</span>
          <span className="font-semibold text-brand-strong">{row ? 'Change' : 'Add'}</span>
        </button>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="secondary" block onClick={onMove}>
          Move to another page
        </Button>
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-pill border border-line-control px-6 py-3 text-body font-semibold text-ink has-focus-visible:outline-2 has-focus-visible:outline-brand-strong">
          Replace with another photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onReplace(Array.from(event.target.files ?? []))}
            className="sr-only"
          />
        </label>
        <Button variant="danger" block onClick={onRemove}>
          Remove from Quest
        </Button>
      </div>
    </Sheet>
  );
}
