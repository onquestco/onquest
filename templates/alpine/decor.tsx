import type { ReactNode } from 'react';
import styles from './alpine.module.css';

// Mountain stickers and the place stamp, from the design's pine(), peak(), compass(), tent(),
// cloud() and stamp(). Positions and sizes in % of the page.

type Placement = { x: number; y: number; size: number; rotate?: number };

function Sticker({
  x,
  y,
  size,
  rotate = 0,
  viewBox,
  children,
}: Placement & { viewBox: string; children: ReactNode }) {
  return (
    <svg
      className={styles.sticker}
      viewBox={viewBox}
      style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, rotate: `${rotate}deg` }}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function Pine(placement: Placement) {
  return (
    <Sticker viewBox="0 0 70 90" {...placement}>
      <path
        d="M35 6L58 44H46L62 70H8L24 44H12z"
        fill="#5F7F63"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="30" y="68" width="10" height="16" fill="#7a5233" stroke="#fff" strokeWidth="4" />
    </Sticker>
  );
}

function Peak(placement: Placement) {
  return (
    <Sticker viewBox="0 0 90 70" {...placement}>
      <path
        d="M5 62L32 18L46 38L58 26L85 62z"
        fill="#9DB8CE"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M32 18L39 29L33 31L28 25z" fill="#fff" />
    </Sticker>
  );
}

export function Compass(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 80" {...placement}>
      <circle cx="40" cy="40" r="30" fill="#FBFAF6" stroke="#fff" strokeWidth="6" />
      <circle cx="40" cy="40" r="26" fill="none" stroke="#25382E" strokeWidth="2" />
      <path d="M40 18L46 40L40 62L34 40z" fill="#B4532A" />
      <path d="M40 40L46 40L40 62L34 40z" fill="#25382E" />
    </Sticker>
  );
}

function Tent(placement: Placement) {
  return (
    <Sticker viewBox="0 0 90 70" {...placement}>
      <path d="M6 62L45 8L84 62z" fill="#E9B44C" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
      <path d="M45 8L36 62H54z" fill="#B4532A" />
    </Sticker>
  );
}

export function Cloud(placement: Placement) {
  return (
    <Sticker viewBox="0 0 100 60" {...placement}>
      <path
        d="M24 52a16 16 0 0 1 2-32 22 22 0 0 1 42-4 18 18 0 0 1 8 36z"
        fill="#fff"
        stroke="#BFD8EA"
        strokeWidth="3"
      />
    </Sticker>
  );
}

const STICKERS = [Pine, Compass, Tent, Peak, Cloud];

/** Two stickers in the bottom corners, a different pair on each page (the design's stickers[(i*2)%5]). */
export function PageStickers({ pageIndex }: { pageIndex: number }) {
  // Both indexes are taken modulo the list's length, so they always exist.
  const Right = STICKERS[(pageIndex * 2) % STICKERS.length] as (typeof STICKERS)[number];
  const Left = STICKERS[(pageIndex * 2 + 1) % STICKERS.length] as (typeof STICKERS)[number];
  return (
    <>
      <Right x={80} y={85} size={14} rotate={8} />
      <Left x={-1} y={84} size={14} rotate={-10} />
    </>
  );
}

/** Dashed trail stamp: a big line in serif, a small line in caps. */
export function Stamp({
  x,
  y,
  width,
  big,
  small,
}: {
  x: number;
  y: number;
  width: number;
  big: string;
  small: string;
}) {
  return (
    <div className={styles.stamp} style={{ left: `${x}%`, top: `${y}%`, width: `${width}%` }}>
      <b>{big}</b>
      <span>{small}</span>
    </div>
  );
}
