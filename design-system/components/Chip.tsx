import type { ButtonHTMLAttributes } from 'react';

// A small rounded choice: place chips on Explore.
export function Chip({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-11 items-center rounded-pill border border-line-control bg-surface px-4 text-label text-ink',
        'focus-visible:outline-2 focus-visible:outline-brand-strong hover:bg-brand-wash',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
