import { useId } from 'react';
import styles from './alpine.module.css';
import {
  BAND_CLIP,
  BAND_EDGE,
  BIRD_PATH,
  birdTransform,
  clouds,
  HEIGHT,
  pineRow,
  ridge,
  stars,
  WIDTH,
  type Bird,
} from './scenery';

// The design's bg(): watercolour mist over layered peaks with a scalloped green band (cover and
// route), and the photo pages' forest, sunrise and night. Drawn at the design's 390 × 650 and
// stretched to the 9:14 page (templates spec D1).
//
// The design paints its paper grain, watercolour washes and the band's streaks with live SVG
// turbulence filters. Those were rendered once from the design's own filters (headless Chrome) and
// saved as small WebP tiles in public/templates/alpine/ (templates spec D3): live turbulence is slow
// on low-end phones, and the Instagram export can't capture url(#filter) reliably. The mist tiles
// already carry the design's fade-in mask, so no SVG mask is needed either.

const TEXTURES = '/templates/alpine';

export type Scene = 'mist' | 'forest' | 'sunrise' | 'night';

type Stop = readonly [offset: number, color: string];

type GradientName =
  | 'band'
  | 'back'
  | 'middle'
  | 'front'
  | 'sunSky'
  | 'nightSky'
  | 'sunFar'
  | 'sunMiddle'
  | 'sunNear'
  | 'nightFar'
  | 'nightNear';

// The design's gradients, by name.
const GRADIENTS: Record<GradientName, readonly Stop[]> = {
  band: [[0, '#5E9441'], [1, '#B9CF8B']],
  back: [[0, '#5B7FA8'], [1, '#A9BF93']],
  middle: [[0, '#4E78A6'], [0.5, '#8FAE6E'], [1, '#9DB462']],
  front: [[0, '#7FA05B'], [1, '#A5BA6B']],
  sunSky: [[0, '#F2B3A6'], [0.5, '#FFD7B0'], [1, '#FFEFCB']],
  nightSky: [[0, '#16213E'], [0.6, '#34487C'], [1, '#6E7FB0']],
  sunFar: [[0, '#9A86B0'], [1, '#D9A9A0']],
  sunMiddle: [[0, '#6F6A98'], [1, '#A57F96']],
  sunNear: [[0, '#3F4570'], [1, '#5A4F78']],
  nightFar: [[0, '#3D5384'], [1, '#4D6393']],
  nightNear: [[0, '#26365F'], [1, '#32477A']],
};

const USES: Record<Scene, GradientName[]> = {
  mist: ['band', 'back', 'middle', 'front'],
  forest: ['band'],
  sunrise: ['sunSky', 'sunFar', 'sunMiddle', 'sunNear'],
  night: ['nightSky', 'nightFar', 'nightNear'],
};

// Texture tiles: name → size in the design's units. Washes cover the page plus the 20 units each side
// the mist drifts into; paper repeats.
const TILES = {
  paper: { x: 0, width: 128, height: 128 },
  streak: { x: 0, width: WIDTH, height: 70 },
  'mist-teal': { x: -20, width: 430, height: HEIGHT },
  'mist-green': { x: -20, width: 430, height: HEIGHT },
  'wash-green': { x: -20, width: 430, height: HEIGHT },
  'wash-peach': { x: -20, width: 430, height: HEIGHT },
} as const;

type Tile = keyof typeof TILES;

const TILE_USES: Record<Scene, Tile[]> = {
  mist: ['paper', 'mist-teal', 'mist-green', 'streak'],
  forest: ['paper', 'wash-green', 'streak'],
  sunrise: ['paper', 'wash-peach'],
  night: ['paper', 'mist-teal'],
};

type Props = { scene: Scene; seed: number; cover?: boolean };

/** One page's scenery. `seed` is the design's per-page number, so every page has its own peaks. */
export function Background({ scene, seed, cover = false }: Props) {
  // Many pages share one HTML document, so every id is unique per page.
  const id = `alpine${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const url = (name: string) => `url(#${id}-${name})`;
  const texture = (tile: Tile, opacity: number, x = 0) => (
    <rect x={x} width={x ? 430 : WIDTH} height={HEIGHT} fill={url(tile)} opacity={opacity} />
  );

  return (
    <svg
      className={styles.background}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      data-scene={scene}
      aria-hidden
    >
      <defs>
        {USES[scene].map((name) => (
          <linearGradient key={name} id={`${id}-${name}`} x1="0" y1="0" x2="0" y2="1">
            {GRADIENTS[name].map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        ))}
        {(scene === 'sunrise' || scene === 'night') && (
          // The design points at an undefined url(#glare); a soft white glow is what it meant.
          <radialGradient id={`${id}-glare`}>
            <stop offset="0" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        )}
        {TILE_USES[scene].map((tile) => {
          const { x, width, height } = TILES[tile];
          return (
            <pattern key={tile} id={`${id}-${tile}`} patternUnits="userSpaceOnUse" x={x} width={width} height={height}>
              <image href={`${TEXTURES}/${tile}.webp`} width={width} height={height} preserveAspectRatio="none" />
            </pattern>
          );
        })}
        {(scene === 'mist' || scene === 'forest') && (
          <clipPath id={`${id}-band`}>
            <path d={BAND_CLIP} />
          </clipPath>
        )}
      </defs>

      {scene === 'mist' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill="#F8F5EA" />
          {texture('paper', 0.35)}
          <g className={styles.mist}>
            {texture('mist-teal', cover ? 0.95 : 0.8, -20)}
            {texture('mist-green', 0.7, -20)}
          </g>
          <Birds birds={mistBirds(seed, cover)} />
          <Range base={612} height={105} seed={seed + 1} fill={url('back')} stroke="#3C5A7A" snow />
          <Range base={632} height={80} seed={seed + 4} fill={url('middle')} stroke="#355A3C" />
          <Range base={650} height={52} seed={seed + 7} fill={url('front')} stroke="#355A3C" />
          <Band fill={url('band')} streak={url('streak')} clip={url('band')} />
        </>
      )}

      {scene === 'forest' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill="#F3F4E6" />
          {texture('paper', 0.35)}
          {texture('wash-green', 0.85, -20)}
          <Birds
            birds={[
              { x: 318, y: 168, scale: 1.1, rotate: -4 },
              { x: 352, y: 182, scale: 0.8, rotate: 6 },
            ]}
          />
          <path d="M-10 560L70 470l60 70 70-90 80 100 70-70 50 60V650H-10z" fill="#B7CBA2" opacity=".6" />
          <Pines y={615} count={13} scale={1} fill="#7FA05B" seed={seed} />
          <Pines y={640} count={11} scale={1.2} fill="#4F7A4A" seed={seed + 3} />
          <Pines y={655} count={9} scale={1.45} fill="#2F5D43" seed={seed + 6} />
          <Band fill={url('band')} streak={url('streak')} clip={url('band')} />
        </>
      )}

      {scene === 'sunrise' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill={url('sunSky')} />
          {texture('wash-peach', 0.55, -20)}
          {texture('paper', 0.25)}
          <circle cx="290" cy="500" r="120" fill={url('glare')} opacity=".9" />
          <circle cx="290" cy="500" r="40" fill="#FFF3C9" />
          {clouds(seed).map((cloud) => (
            <ellipse key={cloud.x} cx={cloud.x} cy={cloud.y} rx={cloud.width} ry={cloud.height} fill="#fff" opacity=".45" />
          ))}
          <Birds
            birds={[
              { x: 72, y: 132, scale: 1.1, rotate: -4 },
              { x: 104, y: 146, scale: 0.8, rotate: 6 },
              { x: 300, y: 110, scale: 1.2, rotate: -6 },
            ]}
          />
          <Range base={585} height={140} seed={seed + 1} fill={url('sunFar')} stroke="#5A4F78" snow />
          <Range base={620} height={105} seed={seed + 4} fill={url('sunMiddle')} stroke="#40456E" />
          <Range base={652} height={62} seed={seed + 7} fill={url('sunNear')} stroke="#2B2F52" />
        </>
      )}

      {scene === 'night' && (
        <>
          <rect width={WIDTH} height={HEIGHT} fill={url('nightSky')} />
          {texture('paper', 0.12)}
          {stars(seed).map((star, index) => (
            <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="#fff" opacity={star.opacity} />
          ))}
          <circle cx="326" cy="250" r="70" fill={url('glare')} opacity=".55" />
          <circle cx="326" cy="250" r="20" fill="#FFF3C4" />
          <g className={styles.mist}>{texture('mist-teal', 0.45, -20)}</g>
          <Range base={590} height={130} seed={seed + 1} fill={url('nightFar')} stroke="#8CA0CC" snow />
          <Range base={622} height={100} seed={seed + 4} fill={url('nightNear')} stroke="#5D74A8" />
          <Pines y={652} count={10} scale={1.3} fill="#121C38" seed={seed} />
        </>
      )}
    </svg>
  );
}

function mistBirds(seed: number, cover: boolean): Bird[] {
  if (cover)
    return [
      { x: 338, y: 236, scale: 1.4, rotate: -6 },
      { x: 368, y: 222, scale: 1, rotate: 4 },
      { x: 60, y: 300, scale: 1, rotate: 6 },
    ];
  const flip = seed % 2 === 0;
  return [
    { x: flip ? 318 : 340, y: 160, scale: 1.1, rotate: -4 },
    { x: flip ? 352 : 366, y: 174, scale: 0.8, rotate: 6 },
  ];
}

function Birds({ birds }: { birds: Bird[] }) {
  return (
    <g className={styles.bird}>
      {birds.map((bird) => (
        <path key={`${bird.x}-${bird.y}`} transform={birdTransform(bird)} d={BIRD_PATH} fill="#8a857a" />
      ))}
    </g>
  );
}

type RangeProps = { base: number; height: number; seed: number; fill: string; stroke: string; snow?: boolean };

function Range({ base, height, seed, fill, stroke, snow = false }: RangeProps) {
  const { area, line, snowCaps } = ridge(base, height, seed, snow);
  return (
    <>
      <path d={area} fill={fill} />
      <path d={line} stroke={stroke} strokeWidth="1.6" fill="none" opacity=".55" strokeLinejoin="round" />
      {snowCaps.map((cap) => (
        <path key={cap} d={cap} fill="#fff" opacity=".85" />
      ))}
    </>
  );
}

function Pines({ y, count, scale, fill, seed }: { y: number; count: number; scale: number; fill: string; seed: number }) {
  return (
    <g fill={fill}>
      {pineRow(y, count, scale, seed).map((tree) => (
        <path key={tree} d={tree} />
      ))}
    </g>
  );
}

function Band({ fill, streak, clip }: { fill: string; streak: string; clip: string }) {
  return (
    <>
      <g clipPath={clip}>
        <rect width={WIDTH} height="70" fill={fill} />
        <rect width={WIDTH} height="70" fill={streak} opacity=".75" />
      </g>
      <path d={BAND_EDGE} stroke="#3C5F2B" strokeWidth="1.3" fill="none" opacity=".35" />
    </>
  );
}
