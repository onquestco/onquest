'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { buttonClassName } from '@/design-system/components/Button';
import { trackCreateClick } from '@/features/editor/trackCreateClick';
import { track } from '@/lib/analytics/client';
import { questUnavailableProperties } from './questProperties';
import { looksSignedIn } from './signedInHint';

const AnswerSchema = z.object({ ownerQuestKey: z.uuid().nullable() });

type Props = {
  /** Set on private links: asks whether the person looking owns the Quest. */
  checkOwner?: { handle: string; slug: string };
  /** Sends quest_unavailable once with this reason. The page is cached, so only the browser knows it was seen. */
  viewedReason?: 'private' | 'removed';
};

/** "Make your own Quest", or "Open your Quest" for the owner of a private one. */
export function UnavailableActions({ checkOwner, viewedReason }: Props) {
  const [ownerQuestKey, setOwnerQuestKey] = useState<string | null>(null);
  const handle = checkOwner?.handle;
  const slug = checkOwner?.slug;
  const sent = useRef(false);

  useEffect(() => {
    if (!viewedReason || sent.current) return;
    sent.current = true;
    track('quest_unavailable', questUnavailableProperties(viewedReason, looksSignedIn()));
  }, [viewedReason]);

  useEffect(() => {
    if (!handle || !slug) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ handle, slug });
    fetch(`/api/unavailable-quest?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((body: unknown) => {
        const answer = AnswerSchema.safeParse(body);
        if (answer.success) setOwnerQuestKey(answer.data.ownerQuestKey);
      })
      .catch(() => {}); // stays "Make your own Quest"
    return () => controller.abort();
  }, [handle, slug]);

  return (
    <div className="flex w-full flex-col gap-2">
      {ownerQuestKey ? (
        <Link href={`/quests/${ownerQuestKey}/view`} className={buttonClassName({ block: true })}>
          Open your Quest
        </Link>
      ) : (
        // A private or removed Quest's key isn't given out, so content_id is left out.
        <Link
          href="/quests/new?source=unavailable_quest"
          onClick={() => trackCreateClick({ source: 'unavailable_quest' })}
          className={buttonClassName({ block: true })}
        >
          Make your own Quest
        </Link>
      )}
      <Link href="/" className={buttonClassName({ variant: 'quiet', block: true })}>
        Go to OnQuest
      </Link>
    </div>
  );
}
