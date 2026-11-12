'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { buttonClassName } from '@/design-system/components/Button';

const AnswerSchema = z.object({ ownerQuestKey: z.uuid().nullable() });

type Props = {
  /** Set on private links: asks whether the person looking owns the Quest. */
  checkOwner?: { handle: string; slug: string };
};

/** "Make your own Quest", or "Open your Quest" for the owner of a private one. */
export function UnavailableActions({ checkOwner }: Props) {
  const [ownerQuestKey, setOwnerQuestKey] = useState<string | null>(null);
  const handle = checkOwner?.handle;
  const slug = checkOwner?.slug;

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
        <Link href="/quests/new" className={buttonClassName({ block: true })}>
          Make your own Quest
        </Link>
      )}
      <Link href="/" className={buttonClassName({ variant: 'quiet', block: true })}>
        Go to OnQuest
      </Link>
    </div>
  );
}
