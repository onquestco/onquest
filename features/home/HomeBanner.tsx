'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { PhotoFan } from './PhotoFan';
import { WhatIsAQuestSheet } from './WhatIsAQuestSheet';

/** Screen 11's banner: the one thing to do on Home is make a Quest. */
export function HomeBanner({ firstName }: { firstName?: string }) {
  const [explaining, setExplaining] = useState(false);
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-brand-wash p-4">
      <PhotoFan scenes={['beach', 'street', 'bonfire']} />
      {firstName && <p className="text-label text-ink-muted">Hi {firstName}</p>}
      <h1 className="text-title text-ink">
        Turn your last trip into a <span className="text-brand">Quest</span>
      </h1>
      <p className="text-body text-ink-muted">
        Pick 3 to 15 photos. We&apos;ll make the scrapbook in under a minute.
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/quests/new" className={buttonClassName({ block: true })}>
          Create a Quest
        </Link>
        <Button variant="quiet" block onClick={() => setExplaining(true)}>
          What&apos;s a Quest?
        </Button>
      </div>
      {explaining && <WhatIsAQuestSheet onClose={() => setExplaining(false)} />}
    </section>
  );
}
