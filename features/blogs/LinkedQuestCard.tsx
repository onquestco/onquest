'use client';

import Link from 'next/link';
import { questCardMeta } from '@/design-system/components/QuestCardView';
import { HIDDEN_QUEST_NOTE } from '@/features/blog-editor/BlogPreview';
import { track } from '@/lib/analytics/client';
import { QUEST_SOURCE_CODE } from '@/lib/analytics/codes';
import { withSrc } from '@/lib/analytics/src';
import type { QuestCard } from '@/lib/trip/cards';
import { linkedQuestView } from './linkedQuest';
import { useBlogPage } from './LiveBlogSocialProvider';
import { questClickProperties } from './readerEvents';

/**
 * "From this trip" at the end of the blog (PRD B5, B9): cover, title, "5 pages · 15 photos" and
 * View Quest. A plain link, so Back returns to the same spot in the blog. Absent when there's
 * nothing to show.
 */
export function LinkedQuestCard({ readerQuest }: { readerQuest: QuestCard | null }) {
  const { viewer, blogKey, viewId, countsAsReader } = useBlogPage();
  const view = linkedQuestView(readerQuest, viewer);
  if (!view) return null;
  const { quest, hiddenNote } = view;

  return (
    <section aria-label="From this trip" className="flex flex-col gap-2">
      {quest && <h2 className="text-lead font-semibold text-ink">From this trip</h2>}
      {hiddenNote && (
        <p role="note" className="rounded-md bg-brand-wash px-3 py-2 text-label font-normal text-ink">
          {HIDDEN_QUEST_NOTE}
        </p>
      )}
      {quest?.path && (
        <Link
          href={withSrc(quest.path, QUEST_SOURCE_CODE.blog_or_guide)}
          onClick={() => {
            if (countsAsReader) track('blog_quest_click', questClickProperties({ blogKey, viewId }));
          }}
          className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface focus-visible:outline-2 focus-visible:outline-brand-strong"
        >
          {quest.coverThumb && (
            <img
              src={quest.coverThumb}
              alt=""
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
              className="aspect-4/3 w-full bg-surface-page object-cover"
            />
          )}
          <span className="flex flex-col gap-0.5 px-3 py-3">
            <span className="text-lead font-semibold text-ink">{quest.title}</span>
            <span className="text-caption text-ink-muted">{questCardMeta(quest.pageCount, quest.photoCount)}</span>
            <span className="pt-1 text-label font-semibold text-brand-strong">View Quest</span>
          </span>
        </Link>
      )}
    </section>
  );
}
