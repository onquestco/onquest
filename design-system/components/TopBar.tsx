'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BackIcon } from './icons';

type Props = {
  title: string;
  /** Where Back goes when there's no page to go back to (a link opened in a fresh tab). */
  fallback: string;
  right?: ReactNode;
};

/** The bar on inner screens: ‹ Back, the title in the middle, an optional action on the right. */
export function TopBar({ title, fallback, right }: Props) {
  const router = useRouter();

  function back() {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto grid max-w-lg grid-cols-3 items-center px-2 py-1">
        <button
          type="button"
          onClick={back}
          className="flex min-h-11 items-center gap-1 justify-self-start px-2 text-label font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand-strong"
        >
          <BackIcon size={20} />
          Back
        </button>
        <h1 className="truncate text-center text-body font-semibold text-ink">{title}</h1>
        <div className="flex justify-self-end">{right}</div>
      </div>
    </header>
  );
}
