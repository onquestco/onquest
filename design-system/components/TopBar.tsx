'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BackIcon } from './icons';

type Props = {
  title: string;
  /** Where Back goes when there's no page to go back to (a link opened in a fresh tab). */
  fallback: string;
  /**
   * A fixed place to go instead of the browser's back: the create flow, where going back would
   * land on a step that redirects (Arranging) or start over.
   */
  href?: string;
  /** "Back" (with the arrow) unless set: "Cancel", "Done". */
  label?: string;
  right?: ReactNode;
  /** `p` when the page has its own h1 (a guide, a profile), so there's only one. */
  titleAs?: 'h1' | 'p';
};

/** The bar on inner screens: ‹ Back, the title in the middle, an optional action on the right. */
export function TopBar({ title, fallback, href, label, right, titleAs: Title = 'h1' }: Props) {
  const router = useRouter();

  function back() {
    if (href) router.push(href);
    else if (window.history.length > 1) router.back();
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
          {!label && <BackIcon size={20} />}
          {label ?? 'Back'}
        </button>
        <Title className="truncate text-center text-body font-semibold text-ink">{title}</Title>
        <div className="flex justify-self-end">{right}</div>
      </div>
    </header>
  );
}
