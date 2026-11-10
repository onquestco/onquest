'use client';

import { useEffect } from 'react';

// A short message above the bottom of the screen, optionally with one action (Undo).
// Announced politely to screen readers; disappears on its own unless the person is mid-action.

type Props = {
  message: string;
  /** "Undo". The toast closes after the action runs. */
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Milliseconds before it closes on its own. */
  duration?: number;
};

export function Toast({ message, actionLabel, onAction, onDismiss, duration = 5000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md bg-ink px-4 py-3 text-label font-normal text-surface"
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            onDismiss();
          }}
          className="min-h-11 shrink-0 rounded-pill px-3 font-semibold text-brand-tint focus-visible:outline-2 focus-visible:outline-brand-tint"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
