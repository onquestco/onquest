'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { PhotoFan } from '@/features/home/PhotoFan';
import { WELCOME_STEPS } from '@/features/home/welcomeSteps';

/** Screen 10: three skippable steps after picking a username (first sign-in only). */
export function Welcome() {
  const [step, setStep] = useState(0);
  const current = WELCOME_STEPS[step] ?? WELCOME_STEPS[0];
  const last = step === WELCOME_STEPS.length - 1;
  if (!current) return null;

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-8 bg-surface px-4 pt-4 pb-10">
      <div className="flex justify-end">
        <Link href="/home" className={buttonClassName({ variant: 'quiet' })}>
          Skip
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <PhotoFan scenes={current.scenes} />
        <h1 className="text-title text-ink">{current.headline}</h1>
        <p className="text-body text-ink-muted">{current.text}</p>
        <div aria-hidden className="flex gap-2">
          {WELCOME_STEPS.map((item, index) => (
            <i
              key={item.headline}
              className={`h-1 w-6 rounded-pill ${index === step ? 'bg-brand-strong' : 'bg-line'}`}
            />
          ))}
        </div>
      </div>
      {last ? (
        <div className="flex flex-col gap-2">
          <Link href="/quests/new" className={buttonClassName({ block: true })}>
            Create your first Quest
          </Link>
          <Link href="/home" className={buttonClassName({ variant: 'quiet', block: true })}>
            Look around first
          </Link>
        </div>
      ) : (
        <Button block onClick={() => setStep(step + 1)}>
          Next
        </Button>
      )}
    </main>
  );
}
