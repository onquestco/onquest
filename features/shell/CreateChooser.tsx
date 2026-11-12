'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { CloseIcon, PencilIcon } from '@/design-system/components/icons';
import { Toast } from '@/design-system/components/Toast';
import { placeholderImage, type Scene } from '@/lib/demo/placeholderImages';

const FAN: { scene: Scene; tilt: string }[] = [
  { scene: 'beach', tilt: '-translate-x-12 -rotate-9' },
  { scene: 'street', tilt: '' },
  { scene: 'bonfire', tilt: 'translate-x-12 rotate-9' },
];

/** The Create tab (the prototype's own screen): a Quest, the main thing, or a blog, "Releasing soon". */
export function CreateChooser() {
  const router = useRouter();
  const [blogNote, setBlogNote] = useState(false);

  function close() {
    if (window.history.length > 1) router.back();
    else router.push('/home');
  }

  return (
    <div className="min-h-svh bg-surface-page">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto grid max-w-lg grid-cols-3 items-center px-2 py-1">
          <span />
          <h1 className="text-center text-body font-semibold text-ink">Create</h1>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex size-11 items-center justify-center justify-self-end text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            <CloseIcon />
          </button>
        </div>
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-3.5 px-4 py-4">
        <h2 className="text-title text-ink">What do you want to make?</h2>
        <Link
          href="/quests/new?source=create_menu"
          className="flex flex-col gap-3.5 rounded-lg border-2 border-brand-strong bg-brand-wash p-4.5 shadow-brand"
        >
          <span aria-hidden className="relative block h-37.5">
            {FAN.map(({ scene, tilt }, index) => (
              <img
                key={scene}
                src={placeholderImage(scene, index + 1)}
                alt=""
                className={`absolute top-2 left-1/2 -ml-13 h-31 w-26 bg-surface object-cover p-1.25 pb-4.5 shadow-photo ${tilt}`}
              />
            ))}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-title text-ink">Create a Quest</span>
            <span className="text-label font-normal text-ink-muted">
              Turn 3 to 15 trip photos into an animated scrapbook to share.
            </span>
          </span>
          <span className={buttonClassName({ block: true })}>Start a Quest</span>
        </Link>
        <button
          type="button"
          onClick={() => setBlogNote(true)}
          className="flex items-center gap-3 rounded-md border border-dashed border-line-control bg-surface p-3.5 text-left"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-page text-ink-muted">
            <PencilIcon size={22} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-body font-semibold text-ink-muted">Write a blog</span>
            <span className="text-label font-normal text-ink-muted">
              Tips, guides and longer stories from your travels.
            </span>
          </span>
          <span className="ml-auto shrink-0 rounded-pill bg-logo-brown px-2.5 py-1 text-caption font-bold whitespace-nowrap text-on-night">
            Releasing soon
          </span>
        </button>
      </main>
      {blogNote && (
        <Toast
          message="Blogs are releasing soon. For now, share your trip as a Quest."
          onDismiss={() => setBlogNote(false)}
        />
      )}
    </div>
  );
}
