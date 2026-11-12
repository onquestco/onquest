import type { ButtonHTMLAttributes } from 'react';

// Pill buttons. One `primary` per screen; `quiet` for text-weight actions like "Skip";
// `danger` for deletes. Loading keeps the width and changes the label ("Saving…"), never a bare spinner.

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

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle;

export function Button({ variant, block, className, type = 'button', ...rest }: Props) {
  const classes = [buttonClassName({ variant, block }), className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
