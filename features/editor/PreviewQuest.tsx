'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { track } from '@/lib/analytics/client';
import { QuestPlayerCallbacks, type PageTurn } from '@/templates/shared/QuestPlayer';
import { previewExitProperties, questPreviewProperties } from './createFlowLaterProperties';
import type { Creator } from './getCreator';
import { LostDraft } from './LostDraft';
import { PublishSheet } from './PublishSheet';
import { setPublishSheetOpen } from './useCreateAbandon';
import { usePreviewTrip } from './usePreviewTrip';

/** Screen 7: the real animated Quest, exactly as a viewer will see it. */
export function PreviewQuest({ tripKey, creator }: { tripKey: string; creator: Creator }) {
  const preview = usePreviewTrip(creator);
  const [publishing, setPublishing] = useState(false);
  // Distinct pages seen in this preview (preview_exit.pages_seen); the cover is page 0.
  const seen = useRef(new Set([0]));
  const sentView = useRef(false);
  const ready = preview !== undefined && preview.trip.key === tripKey;
  const templateId = preview?.trip.templateId;
  const pageCount = preview?.trip.days.length ?? 0;

  // quest_preview, once, as soon as the draft is known.
  useEffect(() => {
    if (!ready || !templateId || sentView.current) return;
    sentView.current = true;
    track('quest_preview', questPreviewProperties(tripKey, templateId, pageCount));
  }, [ready, tripKey, templateId, pageCount]);

  useEffect(() => {
    setPublishSheetOpen(publishing);
    return () => setPublishSheetOpen(false);
  }, [publishing]);

  const onPageChange = useCallback((turn: PageTurn) => {
    seen.current.add(turn.to);
  }, []);

  if (!preview || !ready) return <LostDraft />;
  const { trip, template } = preview;
  const TripPage = template.TripPage;
  const exit = (action: 'back_to_edit' | 'publish') =>
    track('preview_exit', previewExitProperties(tripKey, action, seen.current.size));

  return (
    <div className="min-h-svh pb-24">
      <QuestPlayerCallbacks onPageChange={onPageChange}>
        <TripPage trip={trip} />
      </QuestPlayerCallbacks>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Link
            href={`/quests/${tripKey}/review`}
            onClick={() => exit('back_to_edit')}
            className={`${buttonClassName({ variant: 'secondary' })} flex-1`}
          >
            Back to edit
          </Link>
          <Button
            className="flex-1"
            onClick={() => {
              exit('publish');
              setPublishing(true);
            }}
          >
            Publish
          </Button>
        </div>
      </div>
      {publishing && (
        <PublishSheet tripKey={tripKey} creator={creator} onClose={() => setPublishing(false)} />
      )}
    </div>
  );
}
