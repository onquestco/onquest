'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { COMMENT_MAX } from '@/lib/social/schema';
import { charactersLeft } from './likeCopy';
import { signInPath } from './socialActions';
import { useQuestSocial } from './useQuestSocial';

const ERRORS: Record<string, string> = {
  too_fast: 'Too many comments in a minute. Wait a moment and try again.',
  comments_off: 'Comments are off for this Quest.',
  not_visible: "This Quest isn't available any more.",
};

// Closed, the composer looks like the comment box it opens (the prototype's pill field).
const COMPOSER_PROMPT =
  'flex min-h-11 w-full items-center rounded-pill border border-line-control bg-surface px-4 text-left text-body text-ink-subtle focus-visible:outline-2 focus-visible:outline-brand-strong';

/** "Add a comment". Signed out it signs in first and comes back with the box open (M11). */
export function CommentComposer() {
  const {
    viewer,
    path,
    tripKey,
    actions,
    addComment,
    composerOpen: open,
    setComposerOpen: setOpen,
  } = useQuestSocial();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  if (!viewer.signedIn) {
    return (
      <Link href={signInPath('comment', path, tripKey)} className={COMPOSER_PROMPT}>
        Add a comment
      </Link>
    );
  }
  const text = body.trim();
  const left = charactersLeft(body, COMMENT_MAX);

  async function send() {
    setSending(true);
    setError(null);
    const result = await actions.postComment(text).catch(() => null);
    setSending(false);
    if (result === null || !result.ok) {
      setError((result && ERRORS[result.error]) ?? "Couldn't post your comment. Try again.");
      return;
    }
    addComment(result.data);
    setBody('');
  }

  // The prototype's composer: a pill field and Post beside it.
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (text && !sending) void send();
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={fieldId} className="sr-only">
          Add a comment
        </label>
        <input
          id={fieldId}
          autoFocus={open}
          maxLength={COMMENT_MAX}
          value={body}
          placeholder="Add a comment"
          onFocus={() => setOpen(true)}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-pill border border-line-control bg-surface px-4 text-body text-ink placeholder:text-ink-subtle focus:border-brand-strong focus:outline-2 focus:outline-brand-strong"
        />
        <Button type="submit" className="min-h-11 px-4.5 py-2" disabled={!text || sending}>
          {sending ? 'Posting…' : 'Post'}
        </Button>
      </div>
      {left !== null && (
        <span className="text-caption text-ink-muted" aria-live="polite">
          {left} characters left
        </span>
      )}
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
