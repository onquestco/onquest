'use client';

import { useRef, type ReactNode } from 'react';
import styles from './scrapbook.module.css';

const GAP = 22; // keep in sync with .rail gap

/** "Day by day": horizontally swipeable row of day cards, with arrows on desktop. */
export function DayRail({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const card = rail.current?.firstElementChild as HTMLElement | null;
    if (!card) return;
    rail.current?.scrollBy({ left: direction * (card.offsetWidth + GAP), behavior: 'smooth' });
  };

  return (
    <section className={styles.days} id="days" aria-labelledby="days-title">
      <h2 className={styles.sectionTitle} id="days-title">
        Day by day
      </h2>
      <p className={styles.hint}>swipe &rarr; and tap a photo to read the story</p>
      <div className={styles.railWrap}>
        <button
          type="button"
          className={`${styles.railNav} ${styles.railPrev}`}
          aria-label="Previous day"
          onClick={() => scrollByCard(-1)}
        >
          &#8249;
        </button>
        <div className={styles.rail} ref={rail}>
          {children}
        </div>
        <button
          type="button"
          className={`${styles.railNav} ${styles.railNext}`}
          aria-label="Next day"
          onClick={() => scrollByCard(1)}
        >
          &#8250;
        </button>
      </div>
    </section>
  );
}
