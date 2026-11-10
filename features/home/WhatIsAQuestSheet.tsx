'use client';

import Link from 'next/link';
import { buttonClassName } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { EXAMPLE_QUEST_PATH } from '@/lib/site';
import { WELCOME_STEPS } from './welcomeSteps';

/** "What's a Quest?" from the Home banner: the same three steps as the welcome screens. */
export function WhatIsAQuestSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet open title="What's a Quest?" onClose={onClose}>
      <ol className="flex flex-col gap-3">
        {WELCOME_STEPS.map((step, index) => (
          <li key={step.headline} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-wash text-label font-semibold text-ink">
              {index + 1}
            </span>
            <span>
              <span className="block text-body font-semibold text-ink">{step.headline}</span>
              <span className="text-label font-normal text-ink-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <Link href="/quests/new" className={buttonClassName({ block: true })}>
        Create a Quest
      </Link>
      <Link href={EXAMPLE_QUEST_PATH} className={buttonClassName({ variant: 'quiet', block: true })}>
        See an example
      </Link>
    </Sheet>
  );
}
