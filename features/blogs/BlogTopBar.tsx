'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MoreIcon } from '@/design-system/components/icons';
import { TopBar } from '@/design-system/components/TopBar';
import { ShareLinkButton } from '@/features/shell/ShareLinkButton';
import { useQuestSocial } from '@/features/trip-page/useQuestSocial';
import { useBlogPage } from './LiveBlogSocialProvider';
import { ManageBlogSheet, type ManagedBlog } from './ManageBlogSheet';

type Props = { title: string; path: string };

/**
 * Back (history, else Home) and share for everyone (PRD B5); ⋯ on your own blog once the viewer
 * says it's yours and has given the ⋯ menu's token.
 */
export function BlogTopBar({ title, path }: Props) {
  const router = useRouter();
  const { viewer, blogKey, reloadViewer } = useBlogPage();
  const { commentsOn } = useQuestSocial();
  const [managing, setManaging] = useState(false);
  // Saved changes since the viewer answered; dropped when it's asked again.
  const [changes, setChanges] = useState<Partial<ManagedBlog>>({});

  const managed: ManagedBlog | null =
    viewer?.isOwner && viewer.savedAt && viewer.visibility
      ? { key: blogKey, title, path, visibility: viewer.visibility, commentsOn, savedAt: viewer.savedAt, ...changes }
      : null;

  return (
    <>
      <TopBar
        title="Blog"
        titleAs="p"
        fallback="/home"
        right={
          <div className="flex items-center">
            <ShareLinkButton title={title} path={path} />
            {managed && (
              <button
                type="button"
                onClick={() => setManaging(true)}
                aria-label="Manage this blog"
                className="flex size-11 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-brand-strong"
              >
                <MoreIcon size={20} />
              </button>
            )}
          </div>
        }
      />
      {managed && managing && (
        <ManageBlogSheet
          blog={managed}
          onClose={() => setManaging(false)}
          onChange={(next) => {
            const commentsChanged = next.commentsOn !== managed.commentsOn;
            setChanges({ visibility: next.visibility, commentsOn: next.commentsOn, savedAt: next.savedAt });
            // Comments on or off changes what the page shows below; visibility doesn't change this view.
            if (commentsChanged) router.refresh();
          }}
          onConflict={() => {
            setChanges({});
            reloadViewer();
            router.refresh();
          }}
          onDeleted={() => router.replace('/quests')}
        />
      )}
    </>
  );
}
