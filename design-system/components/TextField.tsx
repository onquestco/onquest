import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

// A labelled input with an optional fixed prefix ("onquest.in/@"), hint, counter and error.
// The label is always visible (never placeholder-only) and inputs stay 16px so phones don't zoom.

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label: ReactNode;
  prefix?: string;
  hint?: string;
  error?: string;
  /** Shows "12/60" when the field has a limit. */
  showCount?: boolean;
};

const box =
  'flex min-h-12 w-full items-center gap-1 rounded-sm border bg-surface px-3 text-body text-ink ' +
  'focus-within:border-brand-strong focus-within:outline-2 focus-within:outline-brand-strong';

export function TextField({ label, prefix, hint, error, showCount, className, ...input }: Props) {
  const messageId = useId();
  const length = typeof input.value === 'string' ? input.value.length : 0;

  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <label className="flex flex-col gap-1">
        <span className="flex justify-between gap-2 text-label text-ink-muted">
          {label}
          {showCount && input.maxLength !== undefined && (
            <span className="text-caption">
              {length}/{input.maxLength}
            </span>
          )}
        </span>
        <span className={`${box} ${error ? 'border-danger' : 'border-line-control'}`}>
          {prefix && <span className="text-ink-muted">{prefix}</span>}
          <input
            {...input}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-ink-subtle"
          />
        </span>
      </label>
      {error ? (
        <p id={messageId} role="alert" className="text-label font-normal text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-label font-normal text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
