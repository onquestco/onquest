'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { useDraft } from './draftStore';
import { LostDraft } from './LostDraft';

const SITE_HOST = 'onquest.in';

/** Screen 8, second half: "Your Quest is live!" with the link and ways to share it. */
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
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-surface px-4 pt-10 pb-10">
      <h1 className="text-center text-title text-ink">Your Quest is live!</h1>
      <p className="truncate rounded-sm border border-line px-3 py-3 text-body text-ink-muted">{shown}</p>
      <div className="flex flex-col gap-3">
        <Button block onClick={() => void copy()}>
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({ variant: 'secondary', block: true })}
        >
          Share to WhatsApp
        </a>
        <Link href={`/quests/${tripKey}/export`} className={buttonClassName({ variant: 'secondary', block: true })}>
          Download for Instagram
        </Link>
      </div>
      {published.visibility === 'private' && (
        <p className="text-center text-label font-normal text-ink-muted">This Quest is private: only you can open the link.</p>
      )}
    </main>
  );
}
