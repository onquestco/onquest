'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClassName } from '@/design-system/components/Button';
import { CloseIcon, PencilIcon } from '@/design-system/components/icons';
import { Toast } from '@/design-system/components/Toast';
import { trackCreateClick } from '@/features/editor/trackCreateClick';
import { currentFromScreen, track } from '@/lib/analytics/client';
import { CREATE_OPTION_CODE } from '@/lib/analytics/codes';
import { placeholderImage, type Scene } from '@/lib/demo/placeholderImages';

const FAN: { scene: Scene; tilt: string }[] = [
  { scene: 'beach', tilt: '-translate-x-12 -rotate-9' },
  { scene: 'street', tilt: '' },
  { scene: 'bonfire', tilt: 'translate-x-12 rotate-9' },
];

export type BlogCreateSource = 'create' | 'write_your_own';

type Props = {
  /** has_feature_access('blogs'): "Write a blog" is live only for people with access (spec §3.9). */
  blogsEnabled?: boolean;
  /** Where the chooser was opened from, passed on to the composer for blog_create_started. */
  source?: BlogCreateSource;
  /** For create_quest_click.is_first_quest_flg; undefined when it couldn't be read. */
  hasPublishedQuest?: boolean;
};

/** create_option_click: `available_flg` is false for the "Releasing soon" blog tap. */
export function createOptionProperties(option: 'quest' | 'blog', blogsEnabled: boolean, fromScreen: number) {
  return {
    option: CREATE_OPTION_CODE[option],
    available_flg: option === 'quest' || blogsEnabled,
    from_screen: fromScreen,
  };
}

const blogCopy = (
  <span className="flex flex-col gap-0.5">
    <span className="text-body font-semibold text-ink">Write a blog</span>
    <span className="text-label font-normal text-ink-muted">Tips, guides and longer stories from your travels.</span>
  </span>
);

/**
 * The Create tab (the prototype's own screen): a Quest, the main thing, or a blog. "Write a blog"
 * opens the composer for people with access; everyone else keeps "Releasing soon" (PRD B1, rollout).
 */
export function CreateChooser({ blogsEnabled = false, source = 'create', hasPublishedQuest }: Props) {
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
          onClick={() => {
            track('create_option_click', createOptionProperties('quest', blogsEnabled, currentFromScreen()));
            trackCreateClick({ source: 'create_menu', hasPublishedQuest });
          }}
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
        {blogsEnabled ? (
          <Link
            href={`/blogs/new?source=${source}`}
            onClick={() =>
              track('create_option_click', createOptionProperties('blog', true, currentFromScreen()))
            }
            className="flex items-center gap-3 rounded-md border border-line-control bg-surface p-3.5 text-left focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-brand-wash text-brand-strong">
              <PencilIcon size={22} />
            </span>
            {blogCopy}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              track('create_option_click', createOptionProperties('blog', false, currentFromScreen()));
              setBlogNote(true);
            }}
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
        )}
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
