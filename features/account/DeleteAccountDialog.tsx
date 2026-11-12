'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Sheet } from '@/design-system/components/Sheet';
import { TextField } from '@/design-system/components/TextField';
import { deleteMyAccount } from './actions';

/** Delete account (M26): type DELETE. Everything goes: Quests, photos, likes, comments, follows. */
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setDeleting(true);
    setFailed(false);
    const result = await deleteMyAccount({ confirm: 'DELETE' }).catch(() => null);
    if (result?.ok) {
      // Signed out now: refresh so nothing of the account stays on screen.
      router.replace('/?deleted=1');
      router.refresh();
      return;
    }
    setDeleting(false);
    setFailed(true);
  }

  return (
    <Sheet open title="Delete your account?" onClose={onClose}>
      <p className="text-body text-ink-muted">
        This deletes your Quests, photos, likes, comments and follows. It can&apos;t be undone. Your username
        won&apos;t be available to anyone again.
      </p>
      <TextField
        label="Type DELETE to confirm"
        value={typed}
        autoCapitalize="characters"
        onChange={(event) => setTyped(event.target.value)}
      />
      {failed && (
        <p role="alert" className="text-label text-danger">
          Couldn&apos;t delete your account. Try again.
        </p>
      )}
      <Button variant="danger" block disabled={typed !== 'DELETE' || deleting} onClick={() => void remove()}>
        {deleting ? 'Deleting…' : 'Delete account'}
      </Button>
    </Sheet>
  );
}
