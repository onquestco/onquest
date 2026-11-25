import { useId } from 'react';
import styles from './coastal.module.css';

// The design's bg(): wet sand with ripples and grain, a shell, a starfish, footprints and pebbles,
// and the sea coming in from the top or the bottom with foam along the shore. Drawn at the design's
// 390 × 650 and stretched to the 9:14 page (templates spec D1).
//
// The design makes its sand ripples, grain and sea light with live SVG turbulence filters. Those are
// baked once into small WebP tiles in public/templates/coastal/ (templates spec D3): live turbulence
// is slow on low-end phones, and the Instagram export can't capture url(#filter) reliably.

const WIDTH = 390;
const HEIGHT = 650;
const TEXTURES = '/templates/coastal';

export type BackgroundVariant = 'cover' | 'top' | 'bottom' | 'route';

// Where the sea meets the sand on each kind of page, as in the design's bg() calls.
const SHORES: Record<BackgroundVariant, { side: 'top' | 'bottom'; edge: number; swell: number }> = {
  cover: { side: 'top', edge: 290, swell: 14 },
  top: { side: 'top', edge: 125, swell: 12 },
  bottom: { side: 'bottom', edge: 505, swell: 12 },
  route: { side: 'bottom', edge: 455, swell: 14 },
};

const round = (value: number) => Math.round(value * 10) / 10;

const PEBBLES = [
  [0.1, 0.4],
  [0.16, 0.46],
  [0.9, 0.15],
  [0.84, 0.2],
  [0.55, 0.97],
] as const;

function Footprints({ x, y }: { x: number; y: number }) {
  return [0, 1, 2, 3, 4].map((step) => {
    const footX = x + (step % 2 ? 9 : -9);
    const footY = round(y + step * 20);
    return (
      <ellipse
        key={step}
        cx={footX}
        cy={footY}
        rx="4.4"
        ry="8"
        transform={`rotate(${step % 2 ? 8 : -8} ${footX} ${footY})`}
        fill="#a9824c"
        opacity=".26"
      />
    );
  });
}

function Texture({ id, width, height, file }: { id: string; width: number; height: number; file: string }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={width} height={height}>
      <image href={`${TEXTURES}/${file}`} width={width} height={height} preserveAspectRatio="none" />
    </pattern>
  );
}

/**
 * The page's beach. `cover` adds gulls and sun glare on the water. `light` pages (light text over
 * the sea) show it at full strength; the others at 60% over the paper (see coastal.module.css).
 */
export function Background({ variant, light = false }: { variant: BackgroundVariant; light?: boolean }) {
  // Many pages share one HTML document, so every id is unique per page.
  const id = `coastal${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { side, edge, swell } = SHORES[variant];
  const top = side === 'top';
  const direction = top ? 1 : -1;
  const sea = top
    ? `M0 0H${WIDTH}V${edge}Q292 ${edge + swell} 195 ${edge}T0 ${edge}Z`
    : `M0 ${HEIGHT}H${WIDTH}V${edge}Q292 ${edge - swell} 195 ${edge}T0 ${edge}Z`;
  const shoreline = `M0 ${edge}Q98 ${edge - direction * swell} 195 ${edge}T${WIDTH} ${edge}`;
  const sandFrom = top ? edge + 50 : 20;
  const sandTo = top ? 640 : edge - 50;
  const onSand = (fraction: number) => round(sandFrom + (sandTo - sandFrom) * fraction);

  return (
    <svg
      className={`${styles.background} ${light ? styles.lit : styles.dim}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-sand`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBEAC6" />
          <stop offset="1" stopColor="#F0CF98" />
        </linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          {top ? (
            <>
              <stop offset="0" stopColor="#0B7C9B" />
              <stop offset=".55" stopColor="#26B4CB" />
              <stop offset="1" stopColor="#9FE8F0" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#A6EAF1" />
              <stop offset=".45" stopColor="#2DBBD0" />
              <stop offset="1" stopColor="#0B7C9B" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`${id}-glare`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <Texture id={`${id}-ripple`} width={390} height={216} file="ripple.webp" />
        <Texture id={`${id}-grain`} width={128} height={128} file="grain.webp" />
        <Texture id={`${id}-caustic`} width={390} height={324} file="caustic.webp" />
        <clipPath id={`${id}-water`}>
          <path d={sea} />
        </clipPath>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-sand)`} />
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-ripple)`} opacity=".55" />
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-grain)`} opacity=".8" />

      <path
        transform={`translate(52 ${onSand(0.86)}) rotate(-14) scale(.6)`}
        d="M0 -22l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z"
        fill="#FF8A5B"
        stroke="#fff"
        strokeWidth="3"
      />
      <g transform={`translate(338 ${onSand(0.62)}) rotate(18) scale(.42)`}>
        <path
          d="M0 -26C-22 -16 -30 10 -18 26H18C30 10 22 -16 0 -26z"
          fill="#f4a6a0"
          stroke="#fff"
          strokeWidth="5"
        />
        <path d="M0 -22V24M-10 -18l-6 42M10 -18l6 42" stroke="#fff" strokeWidth="2.5" fill="none" />
      </g>
      <Footprints x={300} y={onSand(0.74)} />
      {PEBBLES.map(([across, down]) => (
        <ellipse
          key={across}
          cx={round(across * WIDTH)}
          cy={onSand(down)}
          rx={round(3 + across * 3)}
          ry="2.2"
          fill="#9c8363"
          opacity=".55"
        />
      ))}

      {/* Wet sand along the shore. */}
      <path
        d={shoreline}
        stroke="#a9824c"
        strokeWidth="30"
        fill="none"
        opacity=".2"
        transform={`translate(0 ${direction * 18})`}
      />

      <g clipPath={`url(#${id}-water)`}>
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-sea)`} />
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-caustic)`} opacity=".6" />
        {[0.22, 0.5, 0.78].map((fraction, row) => {
          const y = round(top ? edge * fraction : edge + (HEIGHT - edge) * fraction);
          return (
            <g
              key={fraction}
              className={styles.wave}
              style={{
                animationDuration: `${9 + row * 4}s`,
                animationDirection: row % 2 ? 'reverse' : 'normal',
              }}
            >
              <path
                d={`M0 ${y}q32.5 -10 65 0${'t65 0'.repeat(11)}`}
                stroke="#fff"
                strokeOpacity={round(0.55 - row * 0.12)}
                strokeWidth="2.4"
                fill="none"
              />
            </g>
          );
        })}
        {variant === 'cover' && (
          <>
            <g className={styles.gull} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round">
              <path d="M232 128q7 -8 14 0q7 -8 14 0" />
              <path d="M290 164q5 -6 10 0q5 -6 10 0" />
            </g>
            <circle cx="318" cy="58" r="96" fill={`url(#${id}-glare)`} />
          </>
        )}
      </g>

      {/* Foam on the shoreline. */}
      <path
        d={shoreline}
        stroke="#fff"
        strokeWidth="8"
        strokeDasharray=".1 11"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={shoreline}
        stroke="#fff"
        strokeWidth="3.4"
        opacity=".9"
        fill="none"
        transform={`translate(0 ${-direction * 7})`}
      />
    </svg>
  );
}
