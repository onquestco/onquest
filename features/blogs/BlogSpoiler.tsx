'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// A spoiler (`>!text!<`, blogs-editor spec §6.2): covered until tapped. Its text is rendered on the
// server like the rest of the blog, only drawn in the cover's own colour. Once revealed it becomes
// plain text, so links inside it work (a button can't hold a link), and focus moves onto it so a
// keyboard or screen reader user stays in place. data-nosnippet keeps the covered text out of
// search-result snippets; it stays in the HTML, so the page is still crawled in full.

// forced-color-adjust-none: in Windows High Contrast and other forced-colours modes the browser
// would swap in system colours and show the text uncovered.
const COVER = 'rounded-sm bg-ink px-0.5 text-ink box-decoration-clone select-none forced-color-adjust-none';
const FADE = 'transition-colors duration-200 motion-reduce:transition-none';

type Props = {
  /** The spoiler's content with links as plain text, for while it's covered. */
  covered: ReactNode;
  /** The same content with working links, once it's revealed. */
  revealed: ReactNode;
};

export function BlogSpoiler({ covered, revealed }: Props) {
  const [open, setOpen] = useState(false);
  const shown = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (open) shown.current?.focus();
  }, [open]);

  if (open) {
    return (
      <span
        ref={shown}
        tabIndex={-1}
        data-spoiler="revealed"
        data-nosnippet
        className={`rounded-sm bg-brand-wash px-0.5 box-decoration-clone outline-none ${FADE}`}
      >
        {revealed}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-expanded={false}
      aria-label="Spoiler. Tap to reveal"
      data-spoiler="covered"
      onClick={() => setOpen(true)}
      className={`${COVER} ${FADE} inline cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-brand-strong`}
    >
      {/* Google reads data-nosnippet on span, div and section only, so it sits inside the button. */}
      <span data-nosnippet>{covered}</span>
    </button>
  );
}

/**
 * A spoiler that can't be a button: inside a link (no button in an <a>), or inside a spoiler that's
 * still covered (it becomes a BlogSpoiler once the outer one is revealed).
 */
export function CoveredSpoiler({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden data-nosnippet className={COVER}>
        {children}
      </span>
      <span className="sr-only">(spoiler)</span>
    </>
  );
}
