import type { ReactNode } from 'react';
import styles from './scrapbook.module.css';

type Props = {
  children: ReactNode;
  background?: string;
  /** Accessible name for the card, e.g. "Day 2: Chasing the Northern Coast". */
  label?: string;
};

/** A 9:14 story card. Everything inside is positioned in % and sized in container units. */
export function Stage({ children, background, label }: Props) {
  return (
    <div className={styles.stage} style={{ background }} aria-label={label} data-stage>
      {children}
    </div>
  );
}
