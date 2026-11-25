import type { ReactNode } from 'react';
import styles from './coastal.module.css';

// Coastal stickers and the place stamp, from the design's sunSticker(), shellSticker(), … and
// stamp(). Positions and sizes in % of the page.

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

const SUN_RAYS = Array.from({ length: 8 }, (_, ray) => {
  const angle = (ray * Math.PI) / 4;
  const round = (value: number) => Math.round(value * 10) / 10;
  const point = (radius: number) =>
    `${round(40 + Math.cos(angle) * radius)} ${round(40 + Math.sin(angle) * radius)}`;
  return `M${point(25)}L${point(34)}`;
});

export function Sun(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 80" {...placement}>
      <g stroke="#FFD45E" strokeWidth="5" strokeLinecap="round">
        {SUN_RAYS.map((ray) => (
          <path key={ray} d={ray} />
        ))}
      </g>
      <circle cx="40" cy="40" r="19" fill="#FFD45E" stroke="#fff" strokeWidth="5" />
    </Sticker>
  );
}

export function Shell(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 80" {...placement}>
      <path
        d="M40 12C18 22 10 48 22 64H58C70 48 62 22 40 12z"
        fill="#f4a6a0"
        stroke="#fff"
        strokeWidth="5"
      />
      <path d="M40 16v46M30 20l-6 42M50 20l6 42" stroke="#fff" strokeWidth="2.4" fill="none" />
    </Sticker>
  );
}

function Palm(placement: Placement) {
  return (
    <Sticker viewBox="0 0 90 90" {...placement}>
      <path
        d="M44 86C46 64 46 50 48 36"
        stroke="#8a5a2b"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <g fill="#2E9B5B" stroke="#fff" strokeWidth="3" strokeLinejoin="round">
        <path d="M48 36C34 22 18 26 10 38c16-4 28-2 38-2z" />
        <path d="M48 36c14-14 30-10 36 2-16-4-28-4-36-2z" />
        <path d="M48 36C40 20 46 8 58 6c-4 12-6 20-10 30z" />
      </g>
    </Sticker>
  );
}

function Star(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 80" {...placement}>
      <path
        d="M40 8l9 20 22 3-16 15 4 22-19-11-19 11 4-22L9 31l22-3z"
        fill="#FF8A5B"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </Sticker>
  );
}

function Melon(placement: Placement) {
  return (
    <Sticker viewBox="0 0 90 70" {...placement}>
      <path
        d="M6 14h78a39 39 0 0 1-78 0z"
        fill="#E8323C"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M12 18h66a33 33 0 0 1-66 0z" fill="#E8323C" />
      <path d="M6 14a39 39 0 0 0 78 0" fill="none" stroke="#2E9B5B" strokeWidth="5" />
      <g fill="#103A4A">
        <ellipse cx="30" cy="30" rx="2" ry="3.4" />
        <ellipse cx="45" cy="38" rx="2" ry="3.4" />
        <ellipse cx="60" cy="30" rx="2" ry="3.4" />
      </g>
    </Sticker>
  );
}

const STICKERS = [Palm, Shell, Star, Melon, Sun];

/** Two stickers in the bottom corners, a different pair on each page (the design's stickers[(i*2)%5]). */
export function PageStickers({ pageIndex }: { pageIndex: number }) {
  // Both indexes are taken modulo the list's length, so they always exist.
  const Right = STICKERS[(pageIndex * 2) % STICKERS.length] as (typeof STICKERS)[number];
  const Left = STICKERS[(pageIndex * 2 + 1) % STICKERS.length] as (typeof STICKERS)[number];
  return (
    <>
      <Right x={80} y={86} size={15} rotate={8} />
      <Left x={-1} y={85} size={14} rotate={-10} />
    </>
  );
}

/** Dashed postage stamp: a big line in script, a small line in caps. */
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
