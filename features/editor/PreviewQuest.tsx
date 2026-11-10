'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import type { Creator } from './getCreator';
import { LostDraft } from './LostDraft';
import { PublishSheet } from './PublishSheet';
import { usePreviewTrip } from './usePreviewTrip';

/** Screen 7: the real animated Quest, exactly as a viewer will see it. */
export function PreviewQuest({ tripKey, creator }: { tripKey: string; creator: Creator }) {
  const preview = usePreviewTrip(creator);
  const [publishing, setPublishing] = useState(false);
  if (!preview || preview.trip.key !== tripKey) return <LostDraft />;
  const { trip, template } = preview;
  const TripPage = template.TripPage;

  return (
    <div className="min-h-svh pb-24">
      <TripPage trip={trip} />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Link href={`/quests/${tripKey}/review`} className={`${buttonClassName({ variant: 'secondary' })} flex-1`}>
            Back to edit
          </Link>
          <Button className="flex-1" onClick={() => setPublishing(true)}>
            Publish
          </Button>
        </div>
      </div>
      {publishing && <PublishSheet tripKey={tripKey} creator={creator} onClose={() => setPublishing(false)} />}
    </div>
  );
}
