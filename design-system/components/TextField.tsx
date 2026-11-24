import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

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

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** The accessible name. Shown above the box unless `bare`. */
  label: string;
  /**
   * A writing surface with no box and no visible label, where the screen itself is the form (the
   * blog composer's title and body): the placeholder says what goes there, the label is still
   * read by screen readers.
   */
  bare?: boolean;
  /** `title` for a large heading-sized field. Always at least 16px, so phones don't zoom. */
  size?: 'body' | 'title';
  /** "100 / 100" or similar, shown under the field. */
  counter?: string | null;
};

/** Grows with its text instead of scrolling inside itself. */
function grow(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

/** A multi-line field that grows as you type. Use in client components only (it measures itself). */
export function TextArea({ label, bare = false, size = 'body', counter, className, onInput, ...textarea }: TextAreaProps) {
  const counterId = useId();
  const ownId = useId();
  const id = textarea.id ?? ownId;
  const text = size === 'title' ? 'text-title' : 'text-body';
  const box = bare
    ? 'border-0 bg-transparent px-0 py-2 outline-none'
    : 'rounded-sm border border-line-control bg-surface px-3 py-3 focus:border-brand-strong focus:outline-2 focus:outline-brand-strong';
  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <label className={bare ? 'sr-only' : 'text-label text-ink-muted'} htmlFor={id}>
        {label}
      </label>
      <textarea
        {...textarea}
        id={id}
        aria-describedby={counter ? counterId : undefined}
        // A new callback each render, so it measures again after every change: restored or
        // pasted text shows in full too.
        ref={(element) => grow(element)}
        onInput={(event) => {
          grow(event.currentTarget);
          onInput?.(event);
        }}
        className={`block w-full resize-none overflow-hidden text-ink placeholder:text-ink-subtle ${text} ${box}`}
      />
      {counter && (
        <p id={counterId} aria-live="polite" className="self-end text-caption text-ink-muted">
          {counter}
        </p>
      )}
    </div>
  );
}
