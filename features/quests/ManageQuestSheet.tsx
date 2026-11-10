'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClassName, Button } from '@/design-system/components/Button';
import { ConfirmDialog } from '@/design-system/components/ConfirmDialog';
import { Segmented } from '@/design-system/components/Segmented';
import { Sheet } from '@/design-system/components/Sheet';
import { Switch } from '@/design-system/components/Switch';
import { deleteQuest, setQuestComments, setQuestVisibility } from '@/features/editor/publishActions';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';

const VISIBILITY_HELP: Record<Visibility, string> = {
  public: 'Anyone can find it on your profile.',
  unlisted: 'Only people with the link.',
  private: 'Only you. To remove photos completely, delete the Quest.',
};
const CONFLICT = 'This Quest changed on another device. Showing the latest.';
const FAILED = "Couldn't save. Try again.";

type Props = {
  quest: QuestCard;
  onClose: () => void;
  /** A saved change: the card's new savedAt, visibility or comments switch. */
  onChange: (quest: QuestCard) => void;
  onDeleted: () => void;
};

/**
 * ⋯ on a published Quest (spec C §3.10): edit, share, Instagram, who can see it, comments, delete.
 * Each change is based on the card's savedAt; on a conflict the screen reloads the latest.
 */
export function ManageQuestSheet({ quest, onClose, onChange, onDeleted }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  async function save<Result extends { saved: boolean; savedAt?: string; error?: string }>(
    run: () => Promise<{ ok: true; data: Result } | { ok: false; error: string }>,
    change: Partial<QuestCard>,
  ) {
    setBusy(true);
    setMessage(undefined);
    const result = await run().catch(() => null);
    setBusy(false);
    if (!result?.ok) return setMessage(FAILED);
    if (!result.data.saved || !result.data.savedAt) {
      setMessage(result.data.error === 'conflict' ? CONFLICT : FAILED);
      router.refresh();
      return;
    }
    onChange({ ...quest, ...change, savedAt: result.data.savedAt });
  }

  async function share() {
    const url = `${window.location.origin}${quest.path ?? ''}`;
    try {
      if (navigator.share) await navigator.share({ title: quest.title, url });
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
    const result = await deleteQuest({ key: quest.key }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!result?.ok || !result.data.deleted) return setMessage("Couldn't delete the Quest. Try again.");
    onDeleted();
  }

  return (
    <>
      <Sheet open={!confirming} title={quest.title} onClose={onClose}>
        <div className="flex flex-col gap-2">
          <Link
            href={`/quests/${quest.key}/review`}
            className={buttonClassName({ variant: 'secondary', block: true })}
          >
            Edit Quest
          </Link>
          <Button variant="secondary" block onClick={() => void share()}>
            {copied ? 'Link copied' : 'Share link'}
          </Button>
          <Link
            href={`/quests/${quest.key}/export`}
            className={buttonClassName({ variant: 'secondary', block: true })}
          >
            Download for Instagram
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label text-ink-muted">Who can see it</p>
          <Segmented
            label="Who can see it"
            value={quest.visibility}
            onChange={(visibility) =>
              void save(() => setQuestVisibility({ key: quest.key, basedOn: quest.savedAt, visibility }), {
                visibility,
              })
            }
            options={[
              { value: 'public', label: 'Public' },
              { value: 'unlisted', label: 'Unlisted' },
              { value: 'private', label: 'Private' },
            ]}
          />
          <p className="text-label font-normal text-ink-muted">{VISIBILITY_HELP[quest.visibility]}</p>
        </div>

        <Switch
          label="Comments"
          help="Turning them off hides every comment."
          checked={quest.commentsOn ?? true}
          disabled={busy}
          onChange={(on) =>
            void save(() => setQuestComments({ key: quest.key, basedOn: quest.savedAt, on }), {
              commentsOn: on,
            })
          }
        />

        {message && (
          <p role="alert" className="text-label text-danger">
            {message}
          </p>
        )}
        <Button variant="danger" block onClick={() => setConfirming(true)}>
          Delete Quest
        </Button>
      </Sheet>
      <ConfirmDialog
        open={confirming}
        title="Delete this Quest?"
        message="This can't be undone. Its link will say the Quest was removed."
        confirmLabel={busy ? 'Deleting…' : 'Delete Quest'}
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
