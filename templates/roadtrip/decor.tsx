import type { ReactNode } from 'react';
import styles from './roadtrip.module.css';
import { scallopDots } from './scenery';

// Roadtrip stickers and the place stamp, from the design's THEME.stickers (sun, traffic light,
// cloud, butterfly, plane) and stamp(). Positions and sizes in % of the page.

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

export function SunSticker(placement: Placement) {
  return (
    <Sticker viewBox="-40 -40 80 80" {...placement}>
      <g stroke="#fff" strokeWidth="3" fill="#F6A31B">
        {scallopDots(12, 24).map((dot) => (
          <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r="7" />
        ))}
        <circle r="24" stroke="none" />
      </g>
    </Sticker>
  );
}

function TrafficLight(placement: Placement) {
  return (
    <Sticker viewBox="0 0 90 70" {...placement}>
      <rect
        x="10"
        y="4"
        width="50"
        height="50"
        rx="6"
        fill="#F7C531"
        stroke="#fff"
        strokeWidth="5"
        transform="rotate(45 35 29)"
      />
      <rect x="27" y="14" width="16" height="30" rx="5" fill="#333" />
      <circle cx="35" cy="22" r="4" fill="#E5322D" />
      <circle cx="35" cy="29" r="4" fill="#FFD84D" />
      <circle cx="35" cy="36" r="4" fill="#3CC35A" />
      <rect x="33" y="52" width="4" height="16" fill="#8a8a95" />
    </Sticker>
  );
}

function CloudSticker(placement: Placement) {
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

export function ButterflySticker(placement: Placement) {
  return (
    <Sticker viewBox="-30 -20 60 50" {...placement}>
      <g fill="#F28C1B" stroke="#4A2A12" strokeWidth="1.6">
        <path d="M-6 6C-22 -18 -32 0 -14 10C-28 14 -16 30 -6 14z" />
        <path d="M6 6C22 -18 32 0 14 10C28 14 16 30 6 14z" />
      </g>
      <rect x="-1.2" y="-4" width="2.4" height="20" rx="1.2" fill="#4A2A12" />
    </Sticker>
  );
}

function PlaneSticker(placement: Placement) {
  return (
    <Sticker viewBox="0 0 100 60" {...placement}>
      <path
        d="M4 34L70 30L52 8H62L86 28L98 28Q104 32 98 36L86 36L62 56H52L70 38L4 38z"
        fill="#2b2b36"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </Sticker>
  );
}

const STICKERS = [SunSticker, TrafficLight, CloudSticker, ButterflySticker, PlaneSticker];

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

/** Dashed road-sign stamp: a big line in the display font, a small line in caps. */
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
