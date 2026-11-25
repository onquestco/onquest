import type { ReactNode } from 'react';
import styles from './desert.module.css';
import { MOON, PALM_FRONDS, PALM_TRUNK, SPARKLE, STICKER_CACTUS_ARMS, sunRays } from './scenery';

// Desert stickers and the place stamp, from the design's THEME.stickers (moon, sparkle, palm,
// cactus, sun) and stamp(). Positions and sizes in % of the page.

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

export function MoonSticker(placement: Placement) {
  return (
    <Sticker viewBox="-24 -24 48 48" {...placement}>
      <path d={MOON} fill="#7A4A2E" stroke="#FFF3D6" strokeWidth="3.5" strokeLinejoin="round" />
    </Sticker>
  );
}

export function SparkleSticker(placement: Placement) {
  return (
    <Sticker viewBox="-16 -16 32 32" {...placement}>
      <path d={SPARKLE} fill="#B4532A" stroke="#FFF3D6" strokeWidth="2.4" strokeLinejoin="round" />
    </Sticker>
  );
}

function PalmSticker(placement: Placement) {
  return (
    <Sticker viewBox="-60 -120 120 130" {...placement}>
      <path d={PALM_TRUNK} stroke="#5a3d22" strokeWidth="7" fill="none" strokeLinecap="round" />
      <g fill="#3F7D45" stroke="#FFF3D6" strokeWidth="3" strokeLinejoin="round" transform="translate(8 -104)">
        {PALM_FRONDS.slice(0, 3).map((frond) => (
          <path key={frond} d={frond} />
        ))}
      </g>
    </Sticker>
  );
}

function CactusSticker(placement: Placement) {
  return (
    <Sticker viewBox="-20 -44 40 48" {...placement}>
      <g fill="#5E8C4A" stroke="#FFF3D6" strokeWidth="3" strokeLinejoin="round">
        <rect x="-5" y="-40" width="10" height="40" rx="5" />
        <path d={STICKER_CACTUS_ARMS} />
      </g>
    </Sticker>
  );
}

function SunSticker(placement: Placement) {
  return (
    <Sticker viewBox="-40 -40 80 80" {...placement}>
      <g stroke="#FFF3D6" strokeWidth="3" fill="#F28C3B">
        <circle r="18" />
      </g>
      <g stroke="#F6B25C" strokeWidth="4" strokeLinecap="round">
        {sunRays().map((ray) => (
          <path key={ray} d={ray} />
        ))}
      </g>
    </Sticker>
  );
}

const STICKERS = [MoonSticker, SparkleSticker, PalmSticker, CactusSticker, SunSticker];

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

/** Dashed terracotta stamp on parchment: a big line in Poppins, a small line in caps. */
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
