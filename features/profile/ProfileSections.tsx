'use client';

import { useState } from 'react';
import { Segmented } from '@/design-system/components/Segmented';
import { BlogList } from '@/features/blogs/BlogList';
import { NoBlogsYet } from '@/features/blogs/NoBlogsYet';
import type { BlogCard } from '@/lib/blog/cards';
import type { QuestCard } from '@/lib/trip/cards';
import { profileBlogs } from './profileBlogs';
import { ProfileQuestGrid } from './ProfileQuestGrid';
import { OwnProfileNote, useViewer } from './ProfileViewerContext';
import { useOwnBlogs } from './useOwnBlogs';

type Tab = 'quests' | 'blogs';

/**
 * The profile's Quests, and its Blogs behind a Quests · Blogs switch (PRD B6). Without blogs to
 * show, this is exactly the Quests section the profile had before blogs.
 */
export function ProfileSections({ quests, blogs: publicBlogs }: { quests: QuestCard[]; blogs: BlogCard[] }) {
  const viewer = useViewer();
  const isSelf = viewer?.isSelf ?? false;
  const own = useOwnBlogs(isSelf);
  const [tab, setTab] = useState<Tab>('quests');
  const shown = profileBlogs({
    publicBlogs,
    ownBlogs: own.blogs,
    isSelf,
    canWriteBlogs: viewer?.canWriteBlogs ?? false,
  });

  const questList = (
    <>
      {quests.length === 0 ? (
        <p className="text-body text-ink-muted">No public Quests yet.</p>
      ) : (
        <ProfileQuestGrid initial={quests} />
      )}
      <OwnProfileNote />
    </>
  );

  if (!shown.showSwitch)
    return (
      <section aria-label="Quests" className="flex flex-col gap-3 pt-1">
        <h2 className="text-lead font-semibold text-ink">Quests</h2>
        {questList}
      </section>
    );

  return (
    <section aria-label={tab === 'quests' ? 'Quests' : 'Blogs'} className="flex flex-col gap-3 pt-1">
      <h2 className="sr-only">{tab === 'quests' ? 'Quests' : 'Blogs'}</h2>
      <Segmented
        label="Quests or blogs"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'quests', label: 'Quests' },
          { value: 'blogs', label: 'Blogs' },
        ]}
      />
      {/* Both stay mounted, so switching back keeps the Quests grid as it was. */}
      <div hidden={tab !== 'quests'} className="flex flex-col gap-3">
        {questList}
      </div>
      <div hidden={tab !== 'blogs'} className="flex flex-col gap-3">
        {shown.showEmpty ? (
          <NoBlogsYet />
        ) : (
          <BlogList blogs={shown.blogs} own={shown.own} onReload={own.reload} />
        )}
      </div>
    </section>
  );
}
