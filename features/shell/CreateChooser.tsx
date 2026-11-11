'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';

/** The Create tab: a Quest (the main thing) or a blog, which is "Releasing soon". */
export function CreateChooser({ onClose }: { onClose: () => void }) {
  const [blogNote, setBlogNote] = useState(false);
  return (
    <Sheet open title="Create" onClose={onClose}>
      <Link
        href="/quests/new"
        onClick={onClose}
        className="flex flex-col gap-1 rounded-lg border-2 border-brand-strong bg-brand-wash p-4 shadow-brand"
      >
        <span className="text-lead font-semibold text-ink">Create a Quest</span>
        <span className="text-label font-normal text-ink-muted">Pick 3 to 15 photos from a trip</span>
      </Link>
      <button
        type="button"
        onClick={() => setBlogNote(true)}
        className="flex items-center justify-between gap-3 rounded-md border border-dashed border-line-control p-4 text-left"
      >
        <span className="flex flex-col gap-1">
          <span className="text-body font-semibold text-ink-muted">Write a blog</span>
          <span className="text-label font-normal text-ink-muted">
            Tips, guides and longer stories from your travels.
          </span>
        </span>
        <span className="shrink-0 rounded-pill bg-surface-page px-3 py-1 text-caption text-ink-muted">
          Releasing soon
        </span>
      </button>
      {blogNote && (
        <p role="status" className="text-label font-normal text-ink">
          Blogs are releasing soon. For now, share your trip as a Quest.
        </p>
      )}
      <Link href="/quests/new" onClick={onClose} className={buttonClassName({ block: true })}>
        Create a Quest
      </Link>
    </Sheet>
  );
}
