'use client';

import { CommentComposer } from '@/features/trip-page/CommentComposer';
import { CommentList } from '@/features/trip-page/CommentList';
import { LikeButton } from '@/features/trip-page/LikeButton';
import { useQuestSocial } from '@/features/trip-page/useQuestSocial';

/**
 * Likes and comments under the blog (PRD B5, B10, B11): the like with its real count ("Like",
 * "1 like"), the comment count, comments newest last and "Add a comment". Whether comments are on
 * comes from get_blog_social, never the cached page row (BL-01 review N1).
 */
export function BlogSocial() {
  // The total from get_blog_social, kept in step with posts and deletes here: only the newest
  // 100 comments are loaded (review S1).
  const { commentsOn, commentCount: count } = useQuestSocial();

  return (
    <section aria-label="Likes and comments" className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-2">
        {/* The page's own like; the blog provider reports it as blog_page. */}
        <LikeButton source="quest_page" />
        {commentsOn && count > 0 && (
          <span className="shrink-0 text-label font-normal text-ink-muted">
            {count} {count === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </div>
      <div id="comments" className="flex scroll-mt-16 flex-col gap-3">
        {commentsOn ? (
          <>
            <CommentList />
            <CommentComposer />
          </>
        ) : (
          <p className="text-label font-normal text-ink-muted">Comments are off for this blog.</p>
        )}
      </div>
    </section>
  );
}
