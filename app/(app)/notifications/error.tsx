'use client';

import { Button } from '@/design-system/components/Button';

export default function NotificationsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-12 text-center">
      <p className="text-body text-ink-muted">Couldn&apos;t load your notifications.</p>
      <Button variant="secondary" onClick={reset}>
        Retry
      </Button>
    </main>
  );
}
