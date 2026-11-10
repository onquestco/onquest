'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { arrangePages } from './arrange';
import { buildDocument } from './buildDocument';
import { useDraft } from './draftStore';
import { LostDraft } from './LostDraft';

// Screen 4. One line changes as work happens; never a bare spinner. Place names and captions join
// once the geocoder and caption actions exist (A-05 server part); until then only sorting runs.

const MIN_SHOW_MS = 700; // long enough to read the line, short enough not to feel slow

export function Arranging({ tripKey }: { tripKey: string }) {
  const router = useRouter();
  const { key, picked, startedAt, setDocument } = useDraft();
  const [failed, setFailed] = useState(false);
  const known = key === tripKey && picked.length > 0;

  useEffect(() => {
    if (!known) return;
    const timer = setTimeout(() => {
      try {
        const photos = picked.map(({ id, width, height, takenAt }) => ({ id, width, height, takenAt }));
        const arrangement = arrangePages(
          photos.map(({ id, takenAt }) => ({ id, takenAt: takenAt ?? undefined })),
        );
        setDocument(buildDocument('beach', photos, arrangement, () => crypto.randomUUID(), startedAt));
        router.replace(`/quests/${tripKey}/review`);
      } catch {
        setFailed(true);
      }
    }, MIN_SHOW_MS);
    return () => clearTimeout(timer);
  }, [known, picked, startedAt, setDocument, router, tripKey]);

  if (!known) {
    return <LostDraft />;
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p role="status" className="text-lead text-ink">
        {failed
          ? "We couldn't arrange this automatically. Your photos are in the order you picked them."
          : 'Sorting by day…'}
      </p>
    </main>
  );
}
