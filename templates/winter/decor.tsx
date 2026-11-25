import type { ReactNode } from 'react';
import styles from './winter.module.css';
import { FLAKE_ARMS, PINE_TREE } from './scenery';

// Winter stickers and the place stamp, from the design's THEME.stickers (snowflake, beanie, pine,
// snowman, star) and stamp(). Positions and sizes in % of the page.

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

export function SnowflakeSticker(placement: Placement) {
  return (
    <Sticker viewBox="-20 -20 40 40" {...placement}>
      <g stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none">
        {FLAKE_ARMS.map((angle) => (
          <path key={angle} d="M0 -16V16" transform={`rotate(${angle})`} />
        ))}
      </g>
      <circle r="3.5" fill="#fff" />
    </Sticker>
  );
}

function BeanieSticker(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 80" {...placement}>
      <path d="M14 54Q14 18 40 18T66 54z" fill="#D8433A" stroke="#fff" strokeWidth="4" />
      <rect x="10" y="50" width="60" height="12" rx="6" fill="#fff" />
      <circle cx="40" cy="14" r="7" fill="#fff" />
      <path d="M22 36h36M20 44h40" stroke="#fff" strokeWidth="2.4" opacity=".7" />
    </Sticker>
  );
}

function PineSticker(placement: Placement) {
  return (
    <Sticker viewBox="-30 -64 60 90" {...placement}>
      <path d={PINE_TREE} fill="#2F6B5E" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <path d="M0 -58L8 -46L0 -42L-8 -46z" fill="#fff" />
    </Sticker>
  );
}

export function SnowmanSticker(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 100" {...placement}>
      <circle cx="40" cy="68" r="22" fill="#fff" stroke="#BFE0F2" strokeWidth="3" />
      <circle cx="40" cy="36" r="16" fill="#fff" stroke="#BFE0F2" strokeWidth="3" />
      <path d="M26 28q14-14 28 0z" fill="#D8433A" />
      <circle cx="35" cy="36" r="1.8" fill="#222" />
      <circle cx="45" cy="36" r="1.8" fill="#222" />
      <path d="M40 40l9 3-9 2z" fill="#FF8A3D" />
      <path d="M26 48q14 7 28 0v6q-14 7-28 0z" fill="#D8433A" />
    </Sticker>
  );
}

function StarSticker(placement: Placement) {
  return (
    <Sticker viewBox="0 0 80 80" {...placement}>
      <path
        d="M40 8l9 20 22 3-16 15 4 22-19-11-19 11 4-22L9 31l22-3z"
        fill="#FFD45E"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </Sticker>
  );
}

const STICKERS = [SnowflakeSticker, BeanieSticker, PineSticker, SnowmanSticker, StarSticker];

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

/** Dashed red stamp: a big line in the script font, a small line in caps. */
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
