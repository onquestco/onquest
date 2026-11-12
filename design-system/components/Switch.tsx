'use client';

// An on/off setting (Comments, email switches). A button with role="switch", so screen readers
// say "on" or "off"; the whole row is the tap target.

type Props = {
  label: string;
  /** One line under the label. */
  help?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function Switch({ label, help, checked, disabled = false, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-sm py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-50"
    >
      <span className="flex flex-col">
        <span className="text-body text-ink">{label}</span>
        {help && <span className="text-label font-normal text-ink-muted">{help}</span>}
      </span>
      <span
        aria-hidden
        className={`flex h-7 w-12 shrink-0 items-center rounded-pill p-1 transition-colors motion-reduce:transition-none ${
          checked ? 'justify-end bg-brand-strong' : 'justify-start bg-line-control'
        }`}
      >
        <span className="size-5 rounded-pill bg-surface" />
      </span>
    </button>
  );
}
