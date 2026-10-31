import type { CSSProperties } from 'react';
import shared from '../shared/scrapbook.module.css';
import styles from './beach.module.css';

// Beach doodles and paper bits, ported from the Goa reference.

export function Airmail({ style }: { style?: CSSProperties }) {
  return (
    <div className={styles.airmail} style={style} aria-hidden>
      <span>PAR AVION · AIR MAIL</span>
    </div>
  );
}

export function Swatch({ colors, style }: { colors: string[]; style?: CSSProperties }) {
  return (
    <div className={`${shared.text} ${styles.swatch}`} style={style} aria-hidden>
      {colors.map((color) => (
        <i key={color} style={{ background: color }} />
      ))}
    </div>
  );
}

export const Shell = () => (
  <svg
    className={shared.doodle}
    viewBox="0 0 100 100"
    style={{ left: '70%', top: '3%', width: '24%', rotate: '12deg' }}
    aria-hidden
  >
    <path d="M50 90C10 80 5 40 20 25 35 10 65 10 80 25 95 40 90 80 50 90Z" />
    <path d="M50 90 25 22M50 90 40 14M50 90 50 12M50 90 60 14M50 90 75 22" />
  </svg>
);

export const Star = () => (
  <svg
    className={shared.doodle}
    viewBox="0 0 100 100"
    style={{ left: '1%', top: '22%', width: '22%', rotate: '-14deg' }}
    aria-hidden
  >
    <path d="M50 6 61 38 95 38 67 58 78 92 50 71 22 92 33 58 5 38 39 38Z" />
    <path d="M50 24v34M32 46h36" opacity=".5" />
  </svg>
);

export const Waves = () => (
  <svg
    className={shared.doodle}
    viewBox="0 0 300 90"
    style={{ left: 0, bottom: '7%', width: '100%' }}
    aria-hidden
  >
    <path d="M0 40q18-34 38 0t38 0 38 0 38 0 38 0 38 0 38 0 38 0M0 62q18-34 38 0t38 0 38 0 38 0 38 0 38 0 38 0 38 0M0 84q18-34 38 0t38 0 38 0 38 0 38 0 38 0 38 0 38 0" />
  </svg>
);

export const Leaf = () => (
  <svg
    viewBox="0 0 200 200"
    style={{ position: 'absolute', left: '-6%', top: '-5%', width: '56%', rotate: '-6deg', zIndex: 2 }}
    aria-hidden
  >
    <path d="M0 0C70 10 150 50 195 130 120 85 60 70 0 72Z" fill="#4E9A3A" />
    <path d="M0 0C40 40 90 100 120 190 70 120 30 90 0 90Z" fill="#6DB84E" />
    <path d="M0 0C90 -5 170 20 200 60 130 45 60 40 0 50Z" fill="#3C7F2E" />
  </svg>
);

export const Blob = ({ color, style }: { color: string; style: CSSProperties }) => (
  <svg viewBox="0 0 200 200" style={{ position: 'absolute', zIndex: 1, ...style }} aria-hidden>
    <path d="M40 20C90-10 170 10 190 70 210 130 150 190 90 185 30 180-10 100 40 20Z" fill={color} />
  </svg>
);
