'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// A bottom sheet on phones, a centred panel on wider screens. Built on <dialog>, so focus is
// trapped, Escape closes it and the page behind is inert without extra code.

type Props = {
  open: boolean;
  onClose: () => void;
  /** Shown as the sheet's heading and used as its accessible name. */
  title: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onClose={onClose}
      // A tap on the backdrop lands on the dialog itself, not on its content.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-lg bg-surface p-0 text-ink backdrop:bg-night/50 sm:m-auto sm:max-w-md sm:rounded-lg"
    >
      <div className="flex max-h-[85svh] flex-col gap-4 overflow-y-auto px-4 pt-3 pb-8">
        <span aria-hidden className="mx-auto h-1 w-10 rounded-pill bg-line" />
        <h2 className="text-lead font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
