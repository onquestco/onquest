'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { ConfirmDialog } from '@/design-system/components/ConfirmDialog';
import { Segmented } from '@/design-system/components/Segmented';
import { Sheet } from '@/design-system/components/Sheet';
import { Switch } from '@/design-system/components/Switch';
import type { Visibility } from '@/lib/trip/schema';
import { deleteBlog, setBlogComments, setBlogVisibility } from './actions';

/** The posted blog as the ⋯ menu needs it. The blog page, owner view, profile and Quests tab all have these. */
export type ManagedBlog = {
  key: string;
  title: string;
  /** "/@riya/blog/goa-on-15k". */
  path: string;
  visibility: Visibility;
  commentsOn: boolean;
  /** The live row's saved_at: every change is based on it. */
  savedAt: string;
};

const VISIBILITY_HELP: Record<Visibility, string> = {
  public: 'Anyone can find it on your profile.',
  unlisted: 'Only people with the link.',
  private: 'Only you.',
};
export const BLOG_CONFLICT = 'This blog changed on another device. Showing the latest.';
const FAILED = "Couldn't save. Try again.";

type Props = {
  blog: ManagedBlog;
  onClose: () => void;
  /** A saved change: the new savedAt, visibility or comments switch. */
  onChange: (blog: ManagedBlog) => void;
  /** Another device changed it first: reload what's shown (viewer state, page). */
  onConflict: () => void;
  onDeleted: () => void;
};

/**
 * ⋯ on your own posted blog (PRD notify-and-manage flow 2): Edit, Share link, Who can see it,
 * Comments on/off, Delete. Each change passes the savedAt it was based on (decision 0001); the
 * server fires visibility_changed, comments_toggled or content_deleted.
 */
export function ManageBlogSheet({ blog, onClose, onChange, onConflict, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  async function save(
    run: () => Promise<
      { ok: true; data: { saved: true; savedAt: string } | { saved: false; error: string } } | { ok: false; error: string }
    >,
    change: Partial<ManagedBlog>,
  ) {
    setBusy(true);
    setMessage(undefined);
    const result = await run().catch(() => null);
    setBusy(false);
    if (!result?.ok) return setMessage(FAILED);
    if (!result.data.saved) {
      if (result.data.error !== 'conflict') return setMessage(FAILED);
      setMessage(BLOG_CONFLICT);
      onConflict();
      return;
    }
    onChange({ ...blog, ...change, savedAt: result.data.savedAt });
  }

  async function share() {
    const url = `${window.location.origin}${blog.path}`;
    try {
      if (navigator.share) await navigator.share({ title: blog.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Closing the share sheet isn't an error.
    }
  }

  async function remove() {
    setBusy(true);
    const result = await deleteBlog({ key: blog.key }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!result?.ok || !result.data.deleted) return setMessage("Couldn't delete the blog. Try again.");
    onDeleted();
  }

  return (
    <>
      <Sheet open={!confirming} title={blog.title} onClose={onClose}>
        <div className="flex flex-col gap-2">
          <Link href={`/blogs/${blog.key}/edit`} className={buttonClassName({ variant: 'secondary', block: true })}>
            Edit
          </Link>
          <Button variant="secondary" block onClick={() => void share()}>
            {copied ? 'Link copied' : 'Share link'}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label text-ink-muted">Who can see it</p>
          <Segmented
            label="Who can see it"
            value={blog.visibility}
            onChange={(visibility) =>
              void save(() => setBlogVisibility({ key: blog.key, basedOn: blog.savedAt, visibility }), {
                visibility,
              })
            }
            options={[
              { value: 'public', label: 'Public' },
              { value: 'unlisted', label: 'Unlisted' },
              { value: 'private', label: 'Private' },
            ]}
          />
          <p className="text-label font-normal text-ink-muted">{VISIBILITY_HELP[blog.visibility]}</p>
        </div>

        <Switch
          label="Comments"
          help="Turning them off hides every comment."
          checked={blog.commentsOn}
          disabled={busy}
          onChange={(on) =>
            void save(() => setBlogComments({ key: blog.key, basedOn: blog.savedAt, on }), { commentsOn: on })
          }
        />

        {message && (
          <p role="alert" className="text-label text-danger">
            {message}
          </p>
        )}
        <Button variant="danger" block onClick={() => setConfirming(true)}>
          Delete
        </Button>
      </Sheet>
      <ConfirmDialog
        open={confirming}
        title="Delete this blog?"
        message="This can't be undone."
        confirmLabel={busy ? 'Deleting…' : 'Delete blog'}
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
