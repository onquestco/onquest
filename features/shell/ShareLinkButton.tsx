'use client';

import { useState } from 'react';
import { ShareIcon } from '@/design-system/components/icons';

/** The round share icon in a top bar: the phone's share sheet, else copies the link. */
export function ShareLinkButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Closing the share sheet throws; nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? 'Link copied' : 'Share'}
      className="flex size-11 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
    >
      <ShareIcon />
    </button>
  );
}
