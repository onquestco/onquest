'use client';

import { useCallback, useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { Toast } from '@/design-system/components/Toast';
import { TopBar } from '@/design-system/components/TopBar';
import { ShareLinkButton } from '@/features/shell/ShareLinkButton';
import { SITE_URL } from '@/lib/site';
import type { Visibility } from '@/lib/trip/schema';

// "Your blog is live!" (PRD B4): the link, Copy link and Share to WhatsApp, laid out like the
// Quest's share screen. An update lands here too, with "Blog updated.", until the blog page exists.

// The host the link really points at (the preview's own on a preview build), so the box matches what's copied.
const SITE_HOST = new URL(SITE_URL).host;

const WHO_SEES: Record<Visibility, string> = {
  public: 'Anyone can find it on your profile.',
  unlisted: 'Only people with the link can see it.',
  private: 'Only you can see it.',
};

type Props = { title: string; path: string; visibility: Visibility; updated: boolean };

export function BlogShareScreen({ title, path, visibility, updated }: Props) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(updated ? 'Blog updated.' : undefined);
  const clearNotice = useCallback(() => setNotice(undefined), []);
  const url = `${SITE_URL}${path}`;

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
      <TopBar
        title="Shared"
        label="Done"
        href="/home"
        fallback="/home"
        right={<ShareLinkButton title={title} path={path} />}
      />
      <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-surface px-4 pt-6 pb-10">
        <div className="flex flex-col items-center gap-3 pt-3 text-center">
          <span className="flex size-14 animate-oq-pop items-center justify-center rounded-pill bg-brand-wash text-title text-brand-strong">
            ✓
          </span>
          <h2 className="text-title text-ink">Your blog is live!</h2>
          <p className="text-body text-ink-muted">{WHO_SEES[visibility]}</p>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-sm border border-line py-1.5 pr-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate text-body text-ink-muted">
            {SITE_HOST}
            {path}
          </span>
          <Button variant="secondary" className="min-h-10 px-4 py-2" onClick={() => void copy()}>
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
      </main>
      {notice && <Toast message={notice} onDismiss={clearNotice} />}
    </>
  );
}
