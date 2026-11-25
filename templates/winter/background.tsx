import { useId } from 'react';
import styles from './winter.module.css';
import {
  drift,
  FLAKE_ARMS,
  FLAKE_TIPS,
  forestPines,
  HEIGHT,
  PINE_SNOW,
  PINE_TREE,
  ridge,
  snowfall,
  stars,
  WIDTH,
} from './scenery';

// The design's bg(): a snow sky with drifts and big flakes (cover and route), and the photo pages'
// snowy forest at dusk, cabin at night and aurora. Drawn at the design's 390 × 650 and stretched to
// the 9:14 page (templates spec D1).
//
// The design paints its paper grain with a live SVG turbulence filter and blurs the aurora with a
// live Gaussian blur. Both were rendered once and saved as small WebP images in public/templates/
// winter/ (templates spec D3): live filters are slow on low-end phones, and the Instagram export
// can't capture url(#filter) reliably. paper.webp is the same filter as Roadtrip's grain;
// aurora.webp is the two blurred bands, placed back where the design draws them.

const PAPER = '/templates/winter/paper.webp';
const PAPER_TILE = 128;
const AURORA = '/templates/winter/aurora.webp';
// Where aurora.webp sits in the design's box (it was cut to the blurred bands).
const AURORA_BOX = { x: -40, y: 140, width: 470, height: 270 };

export type Scene = 'snow' | 'forest' | 'cabin' | 'aurora';

type Stop = readonly [offset: number, color: string];

// Each scene's sky, from the design's wSnow, wDusk, wNight and wAur.
const SKIES: Record<Scene, readonly Stop[]> = {
  snow: [[0, '#7CC4E6'], [1, '#4FA3D2']],
  forest: [[0, '#8FA7E3'], [1, '#D5DFF7']],
  cabin: [[0, '#0F1F46'], [1, '#2D4A86']],
  aurora: [[0, '#071A33'], [1, '#1D4F63']],
};

// Grain opacity per scene, as in the design (the night skies have none).
const GRAIN: Record<Scene, number> = { snow: 0.12, forest: 0.1, cabin: 0, aurora: 0 };

// The design's snowfall per scene: how many flakes and how bright.
const SNOWFALL: Record<Scene, { count: number; opacity: number }> = {
  snow: { count: 46, opacity: 0.8 },
  forest: { count: 40, opacity: 0.8 },
  cabin: { count: 54, opacity: 0.9 },
  aurora: { count: 30, opacity: 0.7 },
};

type Props = { scene: Scene; seed: number };

/** One page's scenery. `seed` is the design's per-page number, so every page has its own peaks. */
export function Background({ scene, seed }: Props) {
  // Many pages share one HTML document, so every id is unique per page.
  const id = `winter${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const url = (name: string) => `url(#${id}-${name})`;
  const fall = SNOWFALL[scene];

  return (
    <svg
      className={styles.background}
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
        {scene === 'cabin' && (
          <radialGradient id={`${id}-glare`}>
            <stop offset="0" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        )}
        {GRAIN[scene] > 0 && (
          <pattern id={`${id}-paper`} patternUnits="userSpaceOnUse" width={PAPER_TILE} height={PAPER_TILE}>
            <image href={PAPER} width={PAPER_TILE} height={PAPER_TILE} preserveAspectRatio="none" />
          </pattern>
        )}
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill={url('sky')} />
      {GRAIN[scene] > 0 && <rect width={WIDTH} height={HEIGHT} fill={url('paper')} opacity={GRAIN[scene]} />}

      {scene === 'snow' && (
        <>
          <path d={drift(60, 34, 'top')} fill="#CFE9F6" />
          <path d={drift(52, 34, 'top')} fill="#fff" />
          <path d={drift(615, 34, 'bottom')} fill="#CFE9F6" />
          <path d={drift(622, 34, 'bottom')} fill="#fff" />
          <Flake x={372} y={178} scale={1.3} />
          <Flake x={345} y={250} scale={1.5} opacity={0.9} />
          <Flake x={70} y={430} scale={1.1} opacity={0.8} />
          <Flake x={330} y={500} scale={1.2} opacity={0.85} />
          <Flake x={25} y={296} scale={0.9} opacity={0.8} />
        </>
      )}

      {scene === 'forest' && (
        <>
          <Range base={500} height={170} seed={seed} fill="#B3C4EE" snow />
          <Range base={560} height={120} seed={seed + 2} fill="#8EA7D8" />
          {forestPines(seed).map((pine, index) => (
            <SnowPine key={index} {...pine} />
          ))}
          <path d={drift(618, 26, 'bottom')} fill="#fff" />
          <Flake x={60} y={200} scale={1.2} opacity={0.9} />
          <Flake x={320} y={160} scale={1} opacity={0.9} />
        </>
      )}

      {scene === 'cabin' && (
        <>
          <Stars count={60} seed={seed} maxY={360} />
          <circle cx="200" cy="34" r="50" fill={url('glare')} opacity=".45" />
          <circle cx="200" cy="34" r="16" fill="#FFF3C4" />
          <Range base={560} height={130} seed={seed} fill="#3C5A92" snow />
          <path d={drift(590, 24, 'bottom')} fill="#E9F3FA" />
          <Cabin />
          <SnowPine x={60} y={610} scale={1.4} />
          <SnowPine x={110} y={620} scale={1} />
        </>
      )}

      {scene === 'aurora' && (
        <>
          <Stars count={70} seed={seed} maxY={330} />
          <image href={AURORA} {...AURORA_BOX} preserveAspectRatio="none" />
          <Range base={570} height={160} seed={seed} fill="#DCE9F3" />
          <Range base={610} height={110} seed={seed + 2} fill="#fff" />
          <SnowPine x={70} y={628} scale={1.3} />
          <SnowPine x={330} y={630} scale={1.5} />
        </>
      )}

      {/* Falls only in the Quest player, by transform, never with reduced motion (winter.module.css). */}
      <g className={styles.fall} data-snowfall>
        {snowfall(fall.count, seed, fall.opacity).map((flake, index) => (
          <circle key={index} cx={flake.x} cy={flake.y} r={flake.radius} fill="#fff" opacity={flake.opacity} />
        ))}
      </g>
    </svg>
  );
}

function Stars({ count, seed, maxY }: { count: number; seed: number; maxY: number }) {
  return (
    <>
      {stars(count, seed, maxY).map((star, index) => (
        <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="#fff" opacity={star.opacity} />
      ))}
    </>
  );
}

/** The design's flake(): three crossed arms with a small chevron at each of the six tips. */
function Flake({ x, y, scale, opacity = 1 }: { x: number; y: number; scale: number; opacity?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="#fff"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
      opacity={opacity}
    >
      {FLAKE_ARMS.map((angle) => (
        <path key={`arm-${angle}`} d="M0 -14V14" transform={`rotate(${angle})`} />
      ))}
      {FLAKE_TIPS.map((angle) => (
        <path key={`tip-${angle}`} d="M-3.5 -9L0 -12.5L3.5 -9" transform={`rotate(${angle})`} />
      ))}
    </g>
  );
}

function SnowPine({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={PINE_TREE} fill="#2F6B5E" />
      <path d={PINE_SNOW} fill="#fff" opacity=".92" />
      <rect x="-3" y="8" width="6" height="8" fill="#6b4a2b" />
    </g>
  );
}

/** The log cabin on the night page, its window glowing. */
function Cabin() {
  return (
    <g transform="translate(250 590)">
      <rect x="-50" y="-34" width="100" height="40" fill="#5E3A22" />
      <path d="M-60 -32L0 -78L60 -32z" fill="#F4F8FB" />
      <rect x="-34" y="-22" width="22" height="20" fill="#FFC857" />
      <rect x="14" y="-26" width="18" height="32" fill="#3a2314" />
      <circle cx="-23" cy="-12" r="34" fill="#FFC857" opacity=".16" />
    </g>
  );
}

function Range({
  base,
  height,
  seed,
  fill,
  snow = false,
}: {
  base: number;
  height: number;
  seed: number;
  fill: string;
  snow?: boolean;
}) {
  const { area, snowCaps } = ridge(base, height, seed, snow);
  return (
    <>
      <path d={area} fill={fill} />
      {snowCaps.map((cap) => (
        <path key={cap} d={cap} fill="#fff" opacity=".85" />
      ))}
    </>
  );
}
