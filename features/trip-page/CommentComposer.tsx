'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { COMMENT_MAX } from '@/lib/social/schema';
import { charactersLeft } from './likeCopy';
import { signInPath } from './socialActions';
import { useQuestSocial } from './useQuestSocial';

const ERRORS: Record<string, string> = {
  too_fast: 'Too many comments in a minute. Wait a moment and try again.',
  comments_off: 'Comments are off for this Quest.',
  not_visible: "This Quest isn't available any more.",
};

/** "Add a comment". Signed out it signs in first and comes back with the box open (M11). */
export function CommentComposer() {
  const { viewer, path, tripKey, actions, addComment, composerOpen: open, setComposerOpen: setOpen } =
    useQuestSocial();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  if (!viewer.signedIn) {
    return (
      <Link
        href={signInPath('comment', path, tripKey)}
        className={buttonClassName({ variant: 'secondary', block: true })}
      >
        Add a comment
      </Link>
    );
  }
  if (!open) {
    return (
      <Button variant="secondary" block onClick={() => setOpen(true)}>
        Add a comment
      </Button>
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

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (text && !sending) void send();
      }}
    >
      <label htmlFor={fieldId} className="text-label text-ink-muted">
        Your comment
      </label>
      <textarea
        id={fieldId}
        autoFocus
        rows={3}
        maxLength={COMMENT_MAX}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="w-full rounded-sm border border-line-control bg-surface px-3 py-3 text-body text-ink focus:border-brand-strong focus:outline-2 focus:outline-brand-strong"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-ink-muted" aria-live="polite">
          {left !== null && `${left} characters left`}
        </span>
        <Button type="submit" disabled={!text || sending}>
          {sending ? 'Posting…' : 'Post'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
