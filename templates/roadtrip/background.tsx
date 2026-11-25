import { useId } from 'react';
import styles from './roadtrip.module.css';
import {
  BIRD_PATH,
  CLOUD_PATH,
  HEIGHT,
  hillTrees,
  place,
  PLANE_PATH,
  ridge,
  ROAD,
  ROAD_LINE,
  scallopDots,
  stars,
  TRACK,
  WIDTH,
  WING_LEFT,
  WING_RIGHT,
} from './scenery';

// The design's bg(): a day sky with a big scalloped sun, clouds, a plane and the road over green
// hills (cover and route), and the photo pages' sunset, hills and night. Drawn at the design's
// 390 × 650 and stretched to the 9:14 page (templates spec D1).
//
// The design paints its paper grain with a live SVG turbulence filter. That filter was rendered once
// (headless Chrome) and saved as a small WebP tile, public/templates/roadtrip/paper.webp (templates
// spec D3): live turbulence is slow on low-end phones, and the Instagram export can't capture
// url(#filter) reliably.

const PAPER = '/templates/roadtrip/paper.webp';
const PAPER_TILE = 128;

export type Scene = 'day' | 'sunset' | 'hills' | 'night';

type Stop = readonly [offset: number, color: string];

// Each scene's sky, from the design's skyDay, skySet and skyNight.
const SKIES: Record<Scene, readonly Stop[]> = {
  day: [[0, '#79BDF0'], [1, '#D3ECFB']],
  hills: [[0, '#79BDF0'], [1, '#D3ECFB']],
  sunset: [[0, '#5B4B9A'], [0.55, '#F27A54'], [1, '#FFC66B']],
  night: [[0, '#0E1B3D'], [1, '#3A4F8C']],
};

// Grain opacity per scene, as in the design (the night sky has none).
const GRAIN: Record<Scene, number> = { day: 0.18, sunset: 0.15, hills: 0.15, night: 0 };

type Props = {
  scene: Scene;
  seed: number;
  /** A page with light text: the scenery at full strength. Others show it at 60% (see the CSS). */
  light?: boolean;
};

/** One page's scenery. `seed` is the design's per-page number, so every page has its own hills. */
export function Background({ scene, seed, light = false }: Props) {
  // Many pages share one HTML document, so every id is unique per page.
  const id = `roadtrip${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const url = (name: string) => `url(#${id}-${name})`;
  const glare = scene === 'sunset' || scene === 'night';

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
        {GRAIN[scene] > 0 && (
          <pattern id={`${id}-paper`} patternUnits="userSpaceOnUse" width={PAPER_TILE} height={PAPER_TILE}>
            <image href={PAPER} width={PAPER_TILE} height={PAPER_TILE} preserveAspectRatio="none" />
          </pattern>
        )}
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill={url('sky')} />
      {GRAIN[scene] > 0 && <rect width={WIDTH} height={HEIGHT} fill={url('paper')} opacity={GRAIN[scene]} />}

      {scene === 'day' && (
        <>
          <Sun x={20} y={36} radius={62} />
          <g className={styles.drift}>
            <Cloud x={280} y={170} scale={1.7} opacity={0.9} />
            <Cloud x={90} y={300} scale={1.3} opacity={0.85} />
            <Cloud x={330} y={420} scale={1.1} opacity={0.8} />
          </g>
          <path transform={place(300, 74, 1.1, 10)} d={PLANE_PATH} fill="#2b2b36" />
          <g className={styles.bird} fill="#222">
            <path transform={place(160, 120, 1.2)} d={BIRD_PATH} />
            <path transform={place(190, 134, 1)} d={BIRD_PATH} />
            <path transform={place(176, 100, 0.9)} d={BIRD_PATH} />
          </g>
          <Butterfly x={60} y={230} scale={0.8} rotate={-20} />
          <Butterfly x={330} y={330} scale={0.9} rotate={18} />
          <path d="M-10 570Q100 510 220 556T400 530V650H-10z" fill="#6DBE5A" />
          <path d="M-10 598Q140 548 260 586T400 574V650H-10z" fill="#4FA64F" />
          <Road fill="#4A4A58" line="#fff" />
        </>
      )}

      {scene === 'sunset' && (
        <>
          <circle cx="195" cy="470" r="170" fill={url('glare')} opacity=".7" />
          <circle cx="195" cy="470" r="62" fill="#FFE9A0" />
          <g className={styles.drift}>
            <Cloud x={90} y={250} scale={1.5} fill="#FFB88A" opacity={0.7} />
            <Cloud x={310} y={200} scale={1.2} fill="#FFD1A0" opacity={0.7} />
          </g>
          <g className={styles.bird} fill="#2b1f4a">
            <path transform={place(80, 120, 1.2)} d={BIRD_PATH} />
            <path transform={place(110, 134, 0.9)} d={BIRD_PATH} />
          </g>
          <Range base={560} height={150} seed={seed} fill="#4B3A78" stroke="#2f2552" />
          <Range base={600} height={100} seed={seed + 3} fill="#2f2552" />
          <Road fill="#1f1b33" line="#FFB84D" />
        </>
      )}

      {scene === 'hills' && (
        <>
          <g className={styles.drift}>
            <Cloud x={100} y={150} scale={1.6} opacity={0.9} />
            <Cloud x={300} y={260} scale={1.3} opacity={0.85} />
          </g>
          <Sun x={350} y={60} radius={40} />
          <path d="M-10 470Q110 410 230 460T400 430V650H-10z" fill="#8ED16B" />
          <path d="M-10 520Q140 460 260 510T400 490V650H-10z" fill="#5CB55A" />
          <path d="M-10 580Q120 530 250 570T400 556V650H-10z" fill="#3E9A52" />
          {hillTrees(seed).map((tree, index) => (
            <g key={index} transform={place(tree.x, tree.y, tree.scale)}>
              <rect x="-1.5" y="-4" width="3" height="8" fill="#6b4a2b" />
              <circle cy="-10" r="8" fill={tree.color} />
            </g>
          ))}
          <path d={TRACK} stroke="#E9D7A5" strokeWidth="30" fill="none" strokeLinecap="round" />
          <path d={TRACK} stroke="#fff" strokeWidth="2" strokeDasharray="10 10" fill="none" />
          <Butterfly x={70} y={300} scale={0.8} rotate={-12} />
        </>
      )}

      {scene === 'night' && (
        <>
          {stars(80, seed, 400).map((star, index) => (
            <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="#fff" opacity={star.opacity} />
          ))}
          <circle cx="215" cy="30" r="50" fill={url('glare')} opacity=".5" />
          <circle cx="215" cy="30" r="15" fill="#FFF3C4" />
          <Range base={580} height={140} seed={seed} fill="#1d2c58" snow />
          <Range base={615} height={90} seed={seed + 2} fill="#121C38" />
          <Road fill="#0c1226" line="#FFD84D" />
        </>
      )}
    </svg>
  );
}

/** The design's scalloped sun: a ring of white-edged dots around a plain disc. */
function Sun({ x, y, radius }: { x: number; y: number; radius: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#F6A31B" stroke="#fff" strokeWidth="3">
      {scallopDots(14, radius).map((dot) => (
        <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r={radius * 0.2} />
      ))}
      <circle r={radius} stroke="none" />
    </g>
  );
}

type CloudProps = { x: number; y: number; scale: number; fill?: string; opacity: number };

function Cloud({ x, y, scale, fill = '#fff', opacity }: CloudProps) {
  return (
    <path transform={`translate(${x} ${y}) scale(${scale})`} d={CLOUD_PATH} fill={fill} opacity={opacity} />
  );
}

function Butterfly({ x, y, scale, rotate }: { x: number; y: number; scale: number; rotate: number }) {
  return (
    <g transform={place(x, y, scale, rotate)} fill="#F28C1B" stroke="#4A2A12" strokeWidth="1.4">
      <path d={WING_LEFT} />
      <path d={WING_RIGHT} />
    </g>
  );
}

type RangeProps = {
  base: number;
  height: number;
  seed: number;
  fill: string;
  stroke?: string;
  snow?: boolean;
};

function Range({ base, height, seed, fill, stroke, snow = false }: RangeProps) {
  const { area, line, snowCaps } = ridge(base, height, seed, snow);
  return (
    <>
      <path d={area} fill={fill} />
      {stroke && (
        <path d={line} stroke={stroke} strokeWidth="1.6" fill="none" opacity=".5" strokeLinejoin="round" />
      )}
      {snowCaps.map((cap) => (
        <path key={cap} d={cap} fill="#fff" opacity=".85" />
      ))}
    </>
  );
}

function Road({ fill, line }: { fill: string; line: string }) {
  return (
    <>
      <path d={ROAD} fill={fill} />
      <path d={ROAD_LINE} stroke={line} strokeWidth="3.5" strokeDasharray="18 14" fill="none" />
    </>
  );
}
