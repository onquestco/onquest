'use client';

import { useRef, useState } from 'react';
import { Avatar } from '@/design-system/components/Avatar';
import { Toast } from '@/design-system/components/Toast';
import type { Comment } from '@/lib/social/schema';
import { useQuestSocial } from './useQuestSocial';

// A fixed time zone so the server and the browser print the same day (no hydration mismatch).
const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Newest last. The owner can delete any comment; the delete is sent only once Undo has passed. */
export function CommentList() {
  const { comments, viewer, dropComment, restoreComment, actions } = useQuestSocial();
  const [removed, setRemoved] = useState<{ comment: Comment; index: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const undone = useRef(false);

  function remove(comment: Comment, index: number) {
    undone.current = false;
    setRemoved({ comment, index });
    dropComment(comment.key);
  }

  function finish() {
    const pending = removed;
    setRemoved(null);
    if (!pending || undone.current) return;
    void actions.deleteComment(pending.comment.key).then((result) => {
      if (result.ok) return;
      restoreComment(pending.comment, pending.index);
      setFailed(true);
    });
  }

  if (comments.length === 0 && !removed) return null;
  return (
    <>
      <ul className="flex flex-col gap-4">
        {comments.map((comment, index) => (
          <li key={comment.key} className="flex gap-3">
            <Avatar name={comment.author.name} src={comment.author.avatarUrl} size={32} />
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-label text-ink">
                {comment.author.name}{' '}
                <span className="font-normal text-ink-muted">· {when.format(new Date(comment.savedAt))}</span>
              </p>
              <p className="text-body whitespace-pre-line text-ink">{comment.body}</p>
            </div>
            {viewer.isOwner && (
              <button
                type="button"
                className="min-h-11 self-start rounded-pill px-3 text-label text-danger focus-visible:outline-2 focus-visible:outline-brand-strong"
                aria-label={`Delete comment from ${comment.author.name}`}
                onClick={() => remove(comment, index)}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {removed && (
        <Toast
          message="Comment deleted"
          actionLabel="Undo"
          onAction={() => {
            undone.current = true;
            restoreComment(removed.comment, removed.index);
          }}
          onDismiss={finish}
        />
      )}
      {failed && (
        <Toast message="Couldn't delete the comment. Try again." onDismiss={() => setFailed(false)} />
      )}
    </>
  );
}
