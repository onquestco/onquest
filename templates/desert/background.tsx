import { useId } from 'react';
import styles from './desert.module.css';
import {
  CACTUS_ARMS,
  CAMEL,
  dune,
  HEIGHT,
  MOON,
  PALM_FRONDS,
  PALM_TRUNK,
  place,
  SPARKLE,
  stars,
  WIDTH,
} from './scenery';

// The design's bg(): sand dunes under a crescent moon (cover and route), and the photo pages' big
// sun, dusk with a camel caravan, and starry night. Drawn at the design's 390 × 650 and stretched to
// the 9:14 page (templates spec D1).
//
// The design paints its paper grain with a live SVG turbulence filter. It is the same filter as
// Roadtrip's, so the tile it was baked into (headless Chrome, templates spec D3) is reused here as
// public/templates/desert/paper.webp: live turbulence is slow on low-end phones, and the Instagram
// export can't capture url(#filter) reliably. The only other effect, the glare, is a plain gradient.

const PAPER = '/templates/desert/paper.webp';
const PAPER_TILE = 128;

export type Scene = 'dunes' | 'sun' | 'dusk' | 'night';

type Stop = readonly [offset: number, color: string];

// Each scene's sky: a flat sand colour for the dunes, the design's dSun, dDusk and dNight for the rest.
const SKIES: Record<Scene, readonly Stop[]> = {
  dunes: [[0, '#EAD7AC'], [1, '#EAD7AC']],
  sun: [[0, '#FBE6A8'], [1, '#F6BE72']],
  dusk: [[0, '#F3D5BC'], [1, '#DE9577']],
  night: [[0, '#171F4F'], [0.6, '#3A3F7A'], [1, '#6C5A8C']],
};

// Grain opacity per scene, as in the design.
const GRAIN: Record<Scene, number> = { dunes: 0.3, sun: 0.25, dusk: 0.25, night: 0.12 };

const CARAVAN = [
  { x: 70, y: 528 },
  { x: 110, y: 526 },
  { x: 150, y: 530 },
];

type Props = {
  scene: Scene;
  seed: number;
  /** A page with light text: the scenery at full strength. Others show it at 60% (see the CSS). */
  light?: boolean;
};

/** One page's scenery. `seed` is the design's per-page number, so every night has its own stars. */
export function Background({ scene, seed, light = false }: Props) {
  // Many pages share one HTML document, so every id is unique per page.
  const id = `desert${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const url = (name: string) => `url(#${id}-${name})`;
  const glare = scene === 'dusk' || scene === 'night';

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
        {glare && (
          <radialGradient id={`${id}-glare`}>
            <stop offset="0" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        )}
        <pattern id={`${id}-paper`} patternUnits="userSpaceOnUse" width={PAPER_TILE} height={PAPER_TILE}>
          <image href={PAPER} width={PAPER_TILE} height={PAPER_TILE} preserveAspectRatio="none" />
        </pattern>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill={url('sky')} />
      <rect width={WIDTH} height={HEIGHT} fill={url('paper')} opacity={GRAIN[scene]} />

      {scene === 'dunes' && (
        <>
          <path transform={place(332, 150, 1.3)} d={MOON} fill="#7A4A2E" />
          <Sparkle x={320} y={330} scale={1.4} />
          <Sparkle x={350} y={370} scale={0.9} />
          <Sparkle x={60} y={420} scale={0.8} />
          <path d={dune(560, 70, 40)} fill="#D3A57C" />
          <path d={dune(595, 60, -30)} fill="#B9784F" />
          <path d={dune(630, 40, 10)} fill="#CB9A72" />
          <Palm x={46} y={625} scale={0.95} />
        </>
      )}

      {scene === 'sun' && (
        <>
          <circle cx="280" cy="330" r="130" fill="none" stroke="#F6B25C" strokeWidth="2" opacity=".5" />
          <circle cx="280" cy="330" r="100" fill="none" stroke="#F6B25C" strokeWidth="2" opacity=".6" />
          <circle cx="280" cy="330" r="70" fill="#F28C3B" />
          <Sparkle x={60} y={200} scale={1.2} />
          <Sparkle x={90} y={250} scale={0.7} />
          <Sparkle x={340} y={150} scale={1} />
          <path d={dune(540, 80, 30)} fill="#F2C277" />
          <path d={dune(585, 70, -20)} fill="#E5A458" />
          <path d={dune(628, 50, 10)} fill="#C97F45" />
        </>
      )}

      {scene === 'dusk' && (
        <>
          <circle cx="110" cy="450" r="150" fill={url('glare')} opacity=".55" />
          <circle cx="110" cy="450" r="34" fill="#FFE2B0" />
          <Sparkle x={300} y={180} scale={1.2} opacity={0.8} />
          <Sparkle x={340} y={230} scale={0.7} opacity={0.8} />
          <path d={dune(540, 70, 20)} fill="#C77C62" />
          <g fill="#5a3030">
            {CARAVAN.map((camel) => (
              <path key={camel.x} transform={place(camel.x, camel.y, 0.9)} d={CAMEL} />
            ))}
          </g>
          <path d={dune(590, 60, -20)} fill="#A85C4A" />
          <g transform={place(320, 580, 1.1)} fill="#5E3030">
            <rect x="-4" y="-40" width="8" height="40" rx="4" />
            <path d={CACTUS_ARMS} />
          </g>
          <path d={dune(634, 40, 10)} fill="#7E3F3A" />
        </>
      )}

      {scene === 'night' && (
        <>
          {stars(70, seed, 360).map((star, index) => (
            <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="#fff" opacity={star.opacity} />
          ))}
          <circle cx="200" cy="36" r="50" fill={url('glare')} opacity=".4" />
          <path transform={place(200, 36, 1.05)} d={MOON} fill="#FFF3C4" />
          <Sparkle x={60} y={200} scale={1.2} color="#FFF3D6" />
          <Sparkle x={100} y={260} scale={0.7} color="#FFF3D6" />
          <Sparkle x={350} y={300} scale={0.9} color="#FFF3D6" />
          <path d={dune(560, 70, 40)} fill="#3B3F7A" />
          <path d={dune(600, 60, -30)} fill="#2A2E62" />
          <path d={dune(636, 40, 10)} fill="#1B2048" />
          <Palm x={330} y={632} scale={0.9} trunk="#12163a" leaf="#12163a" />
        </>
      )}
    </svg>
  );
}

type SparkleProps = { x: number; y: number; scale: number; color?: string; opacity?: number };

function Sparkle({ x, y, scale, color = '#8A4E2C', opacity = 1 }: SparkleProps) {
  return <path transform={place(x, y, scale)} d={SPARKLE} fill={color} opacity={opacity} />;
}

type PalmProps = { x: number; y: number; scale: number; trunk?: string; leaf?: string };

function Palm({ x, y, scale, trunk = '#3b2a1a', leaf = '#2F3B22' }: PalmProps) {
  return (
    <g transform={place(x, y, scale)}>
      <path d={PALM_TRUNK} stroke={trunk} strokeWidth="6" fill="none" strokeLinecap="round" />
      <g fill={leaf} transform="translate(8 -104)">
        {PALM_FRONDS.map((frond) => (
          <path key={frond} d={frond} />
        ))}
      </g>
    </g>
  );
}
