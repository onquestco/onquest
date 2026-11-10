import styles from './mountain.module.css';

// Mountain doodles. Drawn in the theme's colours through CSS variables.

export function Contours() {
  return (
    <svg className={styles.contours} viewBox="0 0 300 470" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d="M-10 60c60-30 100 30 160 0s90-40 170 10" />
      <path d="M-10 110c70-35 110 35 170 5s80-45 150 0" />
      <path d="M-10 170c40-20 80 40 140 12s100-50 180-6" />
      <path d="M-10 230c60-40 110 26 170 0s90-30 150 12" />
      <path d="M-10 300c50-25 90 30 150 6s90-40 170 4" />
      <path d="M-10 370c60-30 100 24 160 0s80-36 160 8" />
      <ellipse cx="210" cy="130" rx="40" ry="22" />
      <ellipse cx="210" cy="130" rx="18" ry="10" />
      <ellipse cx="70" cy="330" rx="34" ry="18" />
    </svg>
  );
}

export function Ridge() {
  return (
    <svg className={styles.ridge} viewBox="0 0 390 120" preserveAspectRatio="none" aria-hidden>
      <path
        d="M0 120 L60 50 L110 90 L170 30 L240 95 L300 45 L390 100 V120Z"
        fill="var(--accent)"
        opacity=".3"
      />
      <path d="M0 120 L80 80 L150 105 L230 70 L320 100 L390 85 V120Z" fill="var(--ink)" opacity=".25" />
    </svg>
  );
}

const sticker = {
  position: 'absolute',
  zIndex: 6,
  filter: 'drop-shadow(0 0.4cqw 0.4cqw rgba(0,0,0,.2))',
} as const;

export function Pine({
  x,
  y,
  size = 16,
  rotate = 0,
}: {
  x: number;
  y: number;
  size?: number;
  rotate?: number;
}) {
  return (
    <svg
      viewBox="0 0 70 90"
      style={{ ...sticker, left: `${x}%`, top: `${y}%`, width: `${size}%`, rotate: `${rotate}deg` }}
      aria-hidden
    >
      <path
        d="M35 6 L58 44 H46 L62 70 H8 L24 44 H12Z"
        fill="var(--accent)"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="30" y="68" width="10" height="16" fill="#7a5233" stroke="#fff" strokeWidth="4" />
    </svg>
  );
}

export function Compass({
  x,
  y,
  size = 18,
  rotate = 0,
}: {
  x: number;
  y: number;
  size?: number;
  rotate?: number;
}) {
  return (
    <svg
      viewBox="0 0 80 80"
      style={{ ...sticker, left: `${x}%`, top: `${y}%`, width: `${size}%`, rotate: `${rotate}deg` }}
      aria-hidden
    >
      <circle cx="40" cy="40" r="30" fill="var(--cream)" stroke="#fff" strokeWidth="6" />
      <circle cx="40" cy="40" r="26" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <path d="M40 18 L46 40 L40 62 L34 40Z" fill="var(--accent2)" />
      <path d="M40 40 L46 40 L40 62 L34 40Z" fill="var(--ink)" />
    </svg>
  );
}

export function Peak({
  x,
  y,
  size = 20,
  rotate = 0,
}: {
  x: number;
  y: number;
  size?: number;
  rotate?: number;
}) {
  return (
    <svg
      viewBox="0 0 90 70"
      style={{ ...sticker, left: `${x}%`, top: `${y}%`, width: `${size}%`, rotate: `${rotate}deg` }}
      aria-hidden
    >
      <path
        d="M5 62 L32 18 L46 38 L58 26 L85 62Z"
        fill="var(--sky)"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M32 18 L39 29 L33 31 L28 25Z" fill="#fff" />
    </svg>
  );
}

/** One of the three stickers, picked by page number so each page gets a different one. */
export function PageSticker({ pageNumber }: { pageNumber: number }) {
  const which = pageNumber % 3;
  if (which === 0) return <Pine x={80} y={-1} size={15} rotate={10} />;
  if (which === 1) return <Peak x={-2} y={84} size={20} rotate={-8} />;
  return <Compass x={82} y={84} size={16} rotate={6} />;
}
