import type { ButtonHTMLAttributes } from 'react';

// A small rounded choice: place chips on Explore (the prototype's soft orange pills).
export function Chip({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-9 items-center rounded-pill bg-brand-wash px-3.5 text-label text-ink',
        'focus-visible:outline-2 focus-visible:outline-brand-strong hover:bg-brand-tint',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
