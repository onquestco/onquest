import type { ReactNode } from 'react';
import styles from './monsoon.module.css';
import { LEAF_PATH, UMBRELLA_CANOPY, UMBRELLA_HANDLE } from './scenery';

// Monsoon stickers and the place stamp, from the design's THEME.stickers (raindrop, cloud,
// umbrella, lightning, leaf) and stamp(). Positions and sizes in % of the page.

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

export function RaindropSticker(placement: Placement) {
  return (
    <Sticker viewBox="-12 -14 24 30" {...placement}>
      <path
        d="M0 -12C6 -3 9 2 9 6A9 9 0 0 1 -9 6C-9 2 -6 -3 0 -12z"
        fill="#6CC4F2"
        stroke="#fff"
        strokeWidth="2.4"
      />
    </Sticker>
  );
}

function CloudSticker(placement: Placement) {
  return (
    <Sticker viewBox="0 0 100 60" {...placement}>
      <path
        d="M24 52a16 16 0 0 1 2-32 22 22 0 0 1 42-4 18 18 0 0 1 8 36z"
        fill="#4AA3E8"
        stroke="#fff"
        strokeWidth="3"
      />
    </Sticker>
  );
}

function UmbrellaSticker(placement: Placement) {
  return (
    <Sticker viewBox="-40 -4 80 56" {...placement}>
      <path d={UMBRELLA_CANOPY} fill="#F29B1E" stroke="#fff" strokeWidth="3" />
      <path d={UMBRELLA_HANDLE} stroke="#444" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Sticker>
  );
}

function LightningSticker(placement: Placement) {
  return (
    <Sticker viewBox="0 0 40 70" {...placement}>
      <path
        d="M22 4L4 38H16L8 66L34 26H20L30 4z"
        fill="#F8C21B"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </Sticker>
  );
}

function LeafSticker(placement: Placement) {
  return (
    <Sticker viewBox="-24 -24 48 48" {...placement}>
      <path d={LEAF_PATH} fill="#58A55E" stroke="#fff" strokeWidth="3" />
      <path d="M0 -16V16" stroke="#fff" strokeWidth="2" />
    </Sticker>
  );
}

const STICKERS = [RaindropSticker, CloudSticker, UmbrellaSticker, LightningSticker, LeafSticker];

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

/** Dashed orange stamp: a big line in the display font, a small line in caps. */
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
