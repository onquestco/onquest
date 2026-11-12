'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { Contour } from '@/design-system/components/Contour';
import { placeholderImage, type Scene } from '@/lib/demo/placeholderImages';
import { WhatIsAQuestSheet } from './WhatIsAQuestSheet';

// The prototype's banner: three tilted photos in the top-right corner, the text beside them.
const FAN: { scene: Scene; tilt: string }[] = [
  { scene: 'beach', tilt: '-translate-x-10 -rotate-12' },
  { scene: 'street', tilt: '' },
  { scene: 'bonfire', tilt: 'translate-x-10 rotate-12' },
];

/** Screen 11's banner: the one thing to do on Home is make a Quest. */
export function HomeBanner({ firstName }: { firstName?: string }) {
  const [explaining, setExplaining] = useState(false);
  return (
    <section className="relative flex flex-col items-start gap-2.5 overflow-hidden rounded-lg bg-brand-wash px-4.5 pt-5 pb-3.5">
      <Contour />
      <div aria-hidden className="absolute top-6 right-1.5 size-32">
        {FAN.map(({ scene, tilt }, index) => (
          <img
            key={scene}
            src={placeholderImage(scene, index + 1)}
            alt=""
            className={`absolute top-2 left-8 h-23 w-20 bg-surface object-cover p-1 pb-3.5 shadow-photo ${tilt}`}
          />
        ))}
      </div>
      {firstName && (
        <p className="relative font-handwritten text-title font-medium text-brand-strong">Hi {firstName}</p>
      )}
      <h1 className="relative max-w-56 text-title text-ink">Turn your last trip into a Quest</h1>
      <p className="relative max-w-56 text-label font-normal text-ink-muted">
        Pick 3 to 15 photos. We&apos;ll make the scrapbook in under a minute.
      </p>
      <Link href="/quests/new?source=home_banner" className={`${buttonClassName()} relative`}>
        Create a Quest
      </Link>
      <Button variant="quiet" className="relative -mt-1.5 pl-0" onClick={() => setExplaining(true)}>
        What&apos;s a Quest?
      </Button>
      {explaining && <WhatIsAQuestSheet onClose={() => setExplaining(false)} />}
    </section>
  );
}
