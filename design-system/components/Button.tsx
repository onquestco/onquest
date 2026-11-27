import type { ButtonHTMLAttributes } from 'react';

// Pill buttons. One `primary` per screen; `quiet` for text-weight actions like "Skip";
// `danger` for deletes. Loading keeps the width and changes the label ("Saving…"), never a bare spinner:
// `loading` disables the button, sets aria-busy and adds a small spinner before the label.

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

type ButtonStyle = { variant?: ButtonVariant; block?: boolean };

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill border ' +
  'px-6 py-3 text-body leading-5 font-semibold no-underline transition-colors motion-reduce:transition-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-brand-strong text-on-brand hover:enabled:bg-brand',
  secondary: 'border-line-control bg-surface text-ink hover:enabled:bg-brand-wash',
  quiet: 'border-transparent bg-transparent px-3 text-brand-strong hover:enabled:bg-brand-wash',
  danger: 'border-danger bg-surface text-danger',
};

/** The button look, for links that act as buttons (`<Link className={buttonClassName()}>`). */
export function buttonClassName({ variant = 'primary', block = false }: ButtonStyle = {}): string {
  return [base, variants[variant], block ? 'flex w-full' : ''].filter(Boolean).join(' ');
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle & { loading?: boolean };

export function Button({
  variant,
  block,
  className,
  type = 'button',
  loading = false,
  disabled,
  children,
  ...rest
}: Props) {
  const classes = [buttonClassName({ variant, block }), className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// With reduced motion it stays still: the changed label already says something is happening.
function Spinner() {
  return (
    <svg
      aria-hidden
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 animate-spin motion-reduce:animate-none"
    >
      <circle cx={8} cy={8} r={6} strokeWidth={2} className="stroke-current opacity-25" />
      <path d="M8 2a6 6 0 0 1 6 6" strokeWidth={2} strokeLinecap="round" className="stroke-current" />
    </svg>
  );
}
