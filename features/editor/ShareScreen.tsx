'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { TopBar } from '@/design-system/components/TopBar';
import { SITE_URL } from '@/lib/site';
import type { Visibility } from '@/lib/trip/schema';
import { useDraft } from './draftStore';
import { LostDraft } from './LostDraft';

// The host the link really points at (the preview's own on a preview build), so the box matches what's copied.
const SITE_HOST = new URL(SITE_URL).host;

const WHO_SEES: Record<Visibility, string> = {
  public: 'Anyone with the link can see it, and it shows on your profile.',
  unlisted: 'Only people with the link can see it.',
  private: 'Only you can see it.',
};

// Confetti from the prototype: brand colours only, spread across the width.
const CONFETTI_COLOURS = ['bg-brand', 'bg-brand-tint', 'bg-brand-strong'];
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 7) * 90,
  colour: CONFETTI_COLOURS[index % CONFETTI_COLOURS.length],
}));

/** Screen 8, second half: "Your Quest is live!" with the link and ways to share it; Done goes Home. */
export function ShareScreen({ tripKey, siteUrl }: { tripKey: string; siteUrl: string }) {
  const { key, published } = useDraft();
  const [copied, setCopied] = useState(false);
  if (key !== tripKey || !published) return <LostDraft />;

  const url = `${siteUrl}${published.path}`;
  const shown = `${SITE_HOST}${published.path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <TopBar title="Shared" label="Done" href="/home" fallback="/home" />
      <main className="relative mx-auto flex min-h-svh max-w-lg flex-col gap-4 overflow-hidden bg-surface px-4 pt-6 pb-10">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {CONFETTI.map((piece, index) => (
            <i
              key={index}
              className={`absolute -top-3 h-3 w-2 animate-oq-fall ${piece.colour}`}
              style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}ms` }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-3 pt-3 text-center">
          <span className="flex size-14 animate-oq-pop items-center justify-center rounded-pill bg-brand-wash text-title text-brand-strong">
            ✓
          </span>
          <h2 className="text-title text-ink">Your Quest is live!</h2>
          <p className="text-body text-ink-muted">{WHO_SEES[published.visibility]}</p>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-sm border border-line py-1.5 pr-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate text-label font-normal text-ink-muted">{shown}</span>
          <Button variant="secondary" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({ block: true })}
        >
          Share to WhatsApp
        </a>
        <Link
          href={`/quests/${tripKey}/export`}
          className={buttonClassName({ variant: 'secondary', block: true })}
        >
          Download for Instagram
        </Link>
        <Link href={published.path} className={buttonClassName({ variant: 'quiet', block: true })}>
          Open your Quest
        </Link>
      </main>
    </>
  );
}
