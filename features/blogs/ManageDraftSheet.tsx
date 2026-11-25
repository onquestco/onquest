'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClassName } from '@/design-system/components/Button';
import { ConfirmDialog } from '@/design-system/components/ConfirmDialog';
import { Sheet } from '@/design-system/components/Sheet';
import { deleteBlogDraft } from '@/features/blog-editor/actions';
import { browserStorage, forgetNewBlogKey, removeLocalDraft } from '@/features/blog-editor/localDraft';

/** A never-posted blog as its ⋯ menu needs it. */
export type ManagedDraft = { key: string; title: string; ownerKey: string };

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
    const result = await deleteBlogDraft({ key: draft.key }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!result?.ok) return setMessage(FAILED);
    if (!result.data.deleted && result.data.error === 'published') return onPosted();
    // Deleted now, or already gone: either way this device's copy must not come back.
    const storage = browserStorage();
    removeLocalDraft(storage, draft.key);
    forgetNewBlogKey(storage, draft.key, draft.ownerKey);
    onDeleted();
  }

  return (
    <>
      <Sheet open={!confirming} title={draft.title || 'Untitled blog'} onClose={onClose}>
        <Link href={`/blogs/${draft.key}/edit`} className={buttonClassName({ variant: 'secondary', block: true })}>
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
