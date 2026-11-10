'use client';

import { CommentComposer } from './CommentComposer';
import { CommentList } from './CommentList';
import { LikeButton } from './LikeButton';
import { useQuestSocial } from './useQuestSocial';

/** Like and comments under the Quest (screen 9). Comments off hides every comment (M14). */
export function QuestSocial() {
  const { commentsOn } = useQuestSocial();
  return (
    <section aria-label="Likes and comments" className="flex flex-col gap-6">
      <div>
        <LikeButton source="quest_page" />
      </div>
      <div id="comments" className="flex flex-col gap-4">
        <h2 className="text-lead font-semibold text-ink">Comments</h2>
        {commentsOn ? (
          <>
            <CommentList />
            <CommentComposer />
          </>
        ) : (
          <p className="text-body text-ink-muted">Comments are off for this Quest.</p>
        )}
      </div>
    </section>
  );
}
