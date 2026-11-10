'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { BellIcon } from '@/design-system/components/icons';
import { badgeText, bellLabel } from './badge';

// Polled, not pushed (spec B §13): every 30 s while the tab is visible, when it comes back into
// view, and after each navigation. Meets M13's "within 1 minute" without Realtime.
const POLL_MS = 30_000;
const AnswerSchema = z.object({ unread: z.number() });

export function BellBadge() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let controller = new AbortController();
    function refresh() {
      if (document.visibilityState !== 'visible') return;
      controller.abort();
      controller = new AbortController();
      fetch('/api/notifications/unread', { cache: 'no-store', signal: controller.signal })
        .then((response) => response.json())
        .then((body: unknown) => {
          const answer = AnswerSchema.safeParse(body);
          if (answer.success) setUnread(answer.data.unread);
        })
        .catch(() => {}); // keep the last count; the next poll tries again
    }

    refresh();
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [pathname]);

  const text = badgeText(unread);
  return (
    <Link
      href="/notifications"
      aria-label={bellLabel(unread)}
      className="relative flex size-11 items-center justify-center text-ink"
    >
      <BellIcon />
      {text && (
        <span
          aria-hidden
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-pill bg-brand-strong px-1 text-caption font-semibold text-on-brand"
        >
          {text}
        </span>
      )}
    </Link>
  );
}
