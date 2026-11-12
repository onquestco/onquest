'use client';

import { Button } from './Button';
import { Sheet } from './Sheet';

// "Delete this Quest? This can't be undone." One destructive button and a way out.

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Sheet open={open} title={title} onClose={onCancel}>
      <p className="text-body text-ink-muted">{message}</p>
      <div className="flex flex-col gap-2">
        <Button variant="danger" block disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="quiet" block onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
