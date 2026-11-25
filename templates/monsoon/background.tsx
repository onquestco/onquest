import { useId } from 'react';
import styles from './monsoon.module.css';
import {
  band,
  BOLT_PATH,
  CLOUD_PATH,
  DROP_PATH,
  drops,
  HEIGHT,
  LEAF_PATH,
  place,
  rain,
  STREAK,
  UMBRELLA_CANOPY,
  UMBRELLA_HANDLE,
  WIDTH,
} from './scenery';
import { SHADOW_CELLS, SHADOWS, SHADOWS_HEIGHT, SHADOWS_WIDTH, type ShadowKey } from './shadows';

// The design's bg(): layered paper bands, clouds and lightning in a storm sky (the cover is its
// special seed-1 storm, the route the usual one), and the photo pages' lush green rain, bright sky
// and misty umbrellas. Drawn at the design's 390 × 650 and stretched to the 9:14 page (templates
// spec D1).
//
// No live filters (templates spec D3): the paper grain is the same baked tile as Roadtrip's and
// Winter's (public/templates/monsoon/paper.webp), and the cut-paper drop shadows are baked too
// (shadows.ts).

const PAPER = '/templates/monsoon/paper.webp';
const PAPER_TILE = 128;
const GRAIN = 0.1;

export type Scene = 'storm' | 'lush' | 'sky' | 'umbrella';

type Stop = readonly [offset: number, color: string];

// Each scene's sky, from the design's mStorm, mLush, mSky and mMist.
const SKIES: Record<Scene, readonly Stop[]> = {
  storm: [[0, '#0E3560'], [1, '#0A2748']],
  lush: [[0, '#215E49'], [1, '#12392C']],
  sky: [[0, '#BFE6F8'], [1, '#EAF6FC']],
  umbrella: [[0, '#D5E6EA'], [1, '#9CC3CF']],
};

type Props = {
  scene: Scene;
  seed: number;
  /** A page with light text: the scenery at full strength. Others show it at 60% (see the CSS). */
  light?: boolean;
};

/** One page's scenery. `seed` is the design's per-page number; storm with seed 1 is the cover. */
export function Background({ scene, seed, light = false }: Props) {
  // Many pages share one HTML document, so every id is unique per page.
  const id = `monsoon${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const url = (name: string) => `url(#${id}-${name})`;
  const cover = scene === 'storm' && seed === 1;

  return (
    <svg
      className={`${styles.background} ${light ? styles.lit : styles.dim}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      data-scene={scene}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          {SKIES[scene].map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <pattern id={`${id}-paper`} patternUnits="userSpaceOnUse" width={PAPER_TILE} height={PAPER_TILE}>
          <image href={PAPER} width={PAPER_TILE} height={PAPER_TILE} preserveAspectRatio="none" />
        </pattern>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill={url('sky')} />
      <rect width={WIDTH} height={HEIGHT} fill={url('paper')} opacity={GRAIN} />

      {cover && (
        <>
          <Band shadow="cover-band-70" d={band(70, 20, 'top', -20)} fill="#2468AB" />
          <Band shadow="cover-band-44" d={band(44, 18, 'top', 10)} fill="#6CC4F2" />
          <Cloud shadow="cover-cloud" x={300} y={250} scale={2.2} fill="#4AA3E8" />
          <Bolt shadow="cover-bolt" x={292} y={262} scale={1.15} />
          <Drops count={6} seed={seed} color="#6CC4F2" />
          <Band shadow="cover-band-626" d={band(626, 18, 'bottom', 10)} fill="#12457A" />
        </>
      )}

      {scene === 'storm' && !cover && (
        <>
          {/* The design slides this band by seed × 6. Storm is only the route page (seed 9), and its
              shadow is baked for that offset. */}
          <Band shadow="storm-band-140" d={band(140, 24, 'top', 54)} fill="#17497F" />
          <Band shadow="storm-band-112" d={band(112, 24, 'top', -30)} fill="#2468AB" />
          <Band shadow="storm-band-84" d={band(84, 24, 'top', 20)} fill="#3A8FD0" />
          <Band shadow="storm-band-54" d={band(54, 22, 'top', -10)} fill="#6CC4F2" />
          <g className={styles.drift} data-drift>
            <Cloud shadow="storm-drift-1" x={100} y={300} scale={1.5} fill="#2468AB" />
            <Cloud shadow="storm-drift-2" x={330} y={420} scale={1.7} fill="#2468AB" />
            <Cloud shadow="storm-drift-3" x={40} y={470} scale={1.1} fill="#1B5A99" />
          </g>
          <Cloud shadow="storm-cloud" x={250} y={250} scale={2.5} fill="#4AA3E8" />
          <Bolt shadow="storm-bolt" x={238} y={282} scale={1.5} />
          <Drops count={16} seed={seed} color="#6CC4F2" />
          <Band shadow="storm-band-612" d={band(612, 22, 'bottom', 10)} fill="#12457A" />
          <Band shadow="storm-band-634" d={band(634, 20, 'bottom', -20)} fill="#0C3560" />
        </>
      )}

      {scene === 'lush' && (
        <>
          <Rain count={40} seed={seed} color="#fff" opacity={0.3} />
          <Band shadow="lush-band-120" d={band(120, 22, 'top', 10)} fill="#2F7A5B" />
          <Band shadow="lush-band-94" d={band(94, 22, 'top', -20)} fill="#4C9A62" />
          <Band shadow="lush-band-520" d={band(520, 28, 'bottom', 10)} fill="#3F9A5C" />
          <Band shadow="lush-band-560" d={band(560, 26, 'bottom', -30)} fill="#2E8456" />
          <Band shadow="lush-band-596" d={band(596, 24, 'bottom', 20)} fill="#256F4A" />
          <Band shadow="lush-band-630" d={band(630, 20, 'bottom', -10)} fill="#1B5A45" />
          <path transform={place(60, 480, 1.4, -30)} d={LEAF_PATH} fill="#6DBB6E" />
          <path transform={place(330, 500, 1.2, 25)} d={LEAF_PATH} fill="#6DBB6E" />
          <path transform={place(200, 520, 0.9, -8)} d={LEAF_PATH} fill="#4C9A62" />
        </>
      )}

      {scene === 'sky' && (
        <>
          <g className={styles.drift} data-drift>
            <Cloud shadow="sky-drift-1" x={90} y={170} scale={2} fill="#fff" />
            <Cloud shadow="sky-drift-2" x={300} y={250} scale={1.6} fill="#fff" />
          </g>
          <Drops count={14} seed={seed} color="#4EA5DE" />
          <Band shadow="sky-band-540" d={band(540, 26, 'bottom', 10)} fill="#79C3EC" />
          <Band shadow="sky-band-572" d={band(572, 24, 'bottom', -30)} fill="#4EA5DE" />
          <Band shadow="sky-band-602" d={band(602, 22, 'bottom', 20)} fill="#2F86C8" />
          <Band shadow="sky-band-632" d={band(632, 20, 'bottom', -10)} fill="#1E67A8" />
        </>
      )}

      {scene === 'umbrella' && (
        <>
          <Rain count={36} seed={seed} color="#4EA5DE" opacity={0.45} />
          <Umbrella x={80} y={190} scale={1.1} rotate={-12} color="#F29B1E" />
          <Umbrella x={310} y={150} scale={0.9} rotate={14} color="#E5532D" />
          <Umbrella x={250} y={330} scale={0.8} rotate={-6} color="#2F86C8" />
          <Band shadow="umbrella-band-590" d={band(590, 22, 'bottom')} fill="#6F8F9B" />
          {/* Ripples in the puddles. */}
          <g fill="none" stroke="#fff" opacity=".6" strokeWidth="2">
            <ellipse cx="90" cy="626" rx="20" ry="5" />
            <ellipse cx="90" cy="626" rx="34" ry="9" />
            <ellipse cx="300" cy="620" rx="18" ry="4.5" />
            <ellipse cx="300" cy="620" rx="30" ry="8" />
          </g>
        </>
      )}
    </svg>
  );
}

/** A shape's baked drop shadow, cut out of shadows.webp and put back where the design casts it. */
function Shadow({ name }: { name: ShadowKey }) {
  const cell = SHADOW_CELLS[name];
  return (
    <svg
      x={cell.x}
      y={cell.y}
      width={cell.width}
      height={cell.height}
      viewBox={`${cell.sx} ${cell.sy} ${cell.width} ${cell.height}`}
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <image href={SHADOWS} width={SHADOWS_WIDTH} height={SHADOWS_HEIGHT} preserveAspectRatio="none" />
    </svg>
  );
}

function Band({ shadow, d, fill }: { shadow: ShadowKey; d: string; fill: string }) {
  return (
    <>
      <Shadow name={shadow} />
      <path d={d} fill={fill} />
    </>
  );
}

type Placed = { shadow: ShadowKey; x: number; y: number; scale: number };

function Cloud({ shadow, x, y, scale, fill }: Placed & { fill: string }) {
  return (
    <>
      <Shadow name={shadow} />
      <path transform={place(x, y, scale)} d={CLOUD_PATH} fill={fill} />
    </>
  );
}

function Bolt({ shadow, x, y, scale }: Placed) {
  return (
    <>
      <Shadow name={shadow} />
      <path transform={place(x, y, scale)} d={BOLT_PATH} fill="#F8C21B" />
    </>
  );
}

/** Falls only in the Quest player, by transform, never with reduced motion (monsoon.module.css). */
function Rain({
  count,
  seed,
  color,
  opacity,
}: {
  count: number;
  seed: number;
  color: string;
  opacity: number;
}) {
  return (
    <g
      className={styles.fall}
      data-rain
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity={opacity}
    >
      {rain(count, seed).map((streak, index) => (
        <path key={index} d={`M${streak.x} ${streak.y}${STREAK}`} />
      ))}
    </g>
  );
}

function Drops({ count, seed, color }: { count: number; seed: number; color: string }) {
  return (
    <>
      {drops(count, seed).map((drop, index) => (
        <path
          key={index}
          transform={place(drop.x, drop.y, drop.scale)}
          d={DROP_PATH}
          fill={color}
          opacity=".9"
        />
      ))}
    </>
  );
}

function Umbrella({
  x,
  y,
  scale,
  rotate,
  color,
}: {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color: string;
}) {
  return (
    <g transform={place(x, y, scale, rotate)}>
      <path d={UMBRELLA_CANOPY} fill={color} stroke="#fff" strokeWidth="3" />
      <path d={UMBRELLA_HANDLE} stroke="#444" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}
