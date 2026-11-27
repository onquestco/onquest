'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { ConfirmDialog } from '@/design-system/components/ConfirmDialog';
import { Sheet } from '@/design-system/components/Sheet';
import { deleteBlogDraft } from '@/features/blog-editor/actions';
import { browserStorage } from '@/features/blog-editor/localDraft';
import { draftResumedProperties } from '@/features/editor/createFlowLaterProperties';
import { track } from '@/lib/analytics/client';
import { draftDeleteOutcome, forgetDeletedDraft } from './draftDelete';

/** A never-posted blog as its ⋯ menu needs it. */
export type ManagedDraft = {
  key: string;
  title: string;
  ownerKey: string;
  /** The draft's saved_at, for draft_resumed.days_since_last_edit. */
  savedAt?: string;
};

const FAILED = "Couldn't delete the draft. Try again.";

type Props = {
  draft: ManagedDraft;
  onClose: () => void;
  /** Deleted, or already gone: the row goes. */
  onDeleted: () => void;
  /** It was posted on another device in the meantime: show the latest list. */
  onPosted: () => void;
};

/**
 * ⋯ on your own draft (blogs-editor spec §6.3): Continue editing, or Delete draft. Nobody else has
 * seen a draft, so the delete removes its text and photos for good. Posted blogs have
 * ManageBlogSheet instead.
 */
export function ManageDraftSheet({ draft, onClose, onDeleted, onPosted }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string>();

  async function remove() {
    setBusy(true);
    setMessage(undefined);
    const outcome = draftDeleteOutcome(await deleteBlogDraft({ key: draft.key }).catch(() => null));
    setBusy(false);
    setConfirming(false);
    if (outcome === 'failed') return setMessage(FAILED);
    if (outcome === 'posted') return onPosted();
    forgetDeletedDraft(browserStorage(), draft.key, draft.ownerKey);
    onDeleted();
  }

  return (
    <>
      <Sheet open={!confirming} title={draft.title || 'Untitled blog'} onClose={onClose}>
        <Link
          href={`/blogs/${draft.key}/edit`}
          onClick={() =>
            track(
              'draft_resumed',
              draftResumedProperties({
                contentType: 'blog',
                key: draft.key,
                source: 'manage_menu',
                savedAt: draft.savedAt,
                now: new Date(),
              }),
            )
          }
          className={buttonClassName({ variant: 'secondary', block: true })}
        >
          Continue editing
        </Link>
        {message && (
          <p role="alert" className="text-label text-danger">
            {message}
          </p>
        )}
        <Button variant="danger" block onClick={() => setConfirming(true)}>
          Delete draft
        </Button>
      </Sheet>
      <ConfirmDialog
        open={confirming}
        title="Delete this draft?"
        message="It hasn't been posted, so no one else has seen it. Its text and photos will be deleted. This can't be undone."
        confirmLabel={busy ? 'Deleting…' : 'Delete draft'}
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
