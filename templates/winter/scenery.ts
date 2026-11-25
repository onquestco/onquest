// Shapes for the Winter backgrounds, ported from the design's helpers (rng, ridge, stars, flake,
// snowfall, snowPine, drift) in docs/reference/templates/winter.md and roadtrip.html. Everything is
// in the design's 390 × 650 box. Pure and seeded by the page, so a page always draws the same
// scenery (no Math.random()).

export const WIDTH = 390;
export const HEIGHT = 650;

const round = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** The design's rng(): a small seeded generator, kept as is so the scenery matches the design. */
export function designRandom(start: number): () => number {
  let state = start;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

export type Ridge = { area: string; snowCaps: string[] };

/** A range of peaks across the page, with snow on the high peaks when asked. */
export function ridge(base: number, height: number, seed: number, snow: boolean): Ridge {
  const random = designRandom(seed * 97 + 13);
  const points = Array.from({ length: 10 }, (_, index) => {
    const x = round(-10 + (410 * index) / 9);
    const peak = index % 2 === 1;
    const y = round(base - height * (peak ? 0.55 + 0.45 * random() : 0.1 + 0.2 * random()));
    return { x, y, peak };
  });
  const path = points.map(({ x, y }) => `${x} ${y}`).join(' L');
  const snowCaps = snow
    ? points
        .filter(({ y, peak }) => peak && y < base - height * 0.7)
        .map(
          ({ x, y }) =>
            `M${x} ${y}L${round(x - 10)} ${round(y + 17)}L${round(x - 3)} ${round(y + 13)}` +
            `L${x} ${round(y + 21)}L${round(x + 4)} ${round(y + 13)}L${round(x + 10)} ${round(y + 17)}Z`,
        )
    : [];
  return { area: `M-10 ${HEIGHT} L${path} L400 ${HEIGHT}Z`, snowCaps };
}

export type Dot = { x: number; y: number; radius: number; opacity: number };

/** Stars above `maxY`: bigger stars are brighter. */
export function stars(count: number, seed: number, maxY: number): Dot[] {
  const random = designRandom(seed * 7 + 1);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * WIDTH);
    const y = Math.round(random() * maxY);
    const size = random();
    return { x, y, radius: round(0.6 + size * 1.3), opacity: round2(0.4 + size * 0.6) };
  });
}

/** The design's snowfall(): small white dots all over the page, at `opacity` or fainter. */
export function snowfall(count: number, seed: number, opacity: number): Dot[] {
  const random = designRandom(seed * 5 + 9);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * WIDTH);
    const y = Math.round(random() * 640);
    const radius = round(1.2 + random() * 2.4);
    return { x, y, radius, opacity: round2(opacity * (0.4 + random() * 0.6)) };
  });
}

export type Pine = { x: number; y: number; scale: number };

/** The forest page's twelve snowy pines in a row along the bottom, a little uneven. */
export function forestPines(seed: number): Pine[] {
  const random = designRandom(seed * 3 + 1);
  return Array.from({ length: 12 }, (_, index) => {
    const x = round(14 + index * 34 + random() * 10);
    const y = round(600 + random() * 30);
    const scale = round2(0.9 + random() * 0.5);
    return { x, y, scale };
  });
}

/** A wavy snow drift hanging from the top edge, or piled up from the bottom edge. */
export function drift(y: number, amplitude: number, edge: 'top' | 'bottom'): string {
  return edge === 'top'
    ? `M-10 -10H400V${y}Q300 ${y + amplitude} 200 ${y}T-10 ${y}Z`
    : `M-10 660H400V${y}Q300 ${y - amplitude} 200 ${y}T-10 ${y}Z`;
}

/** The snowy pine: a dark tree with white snow on each tier and a brown trunk. */
export const PINE_TREE = 'M0 -60L18 -34H8L22 -14H10L26 8H-26L-10 -14H-22L-8 -34H-18z';
export const PINE_SNOW = 'M0 -60L9 -46L0 -42L-9 -46zM-8 -34L8 -34L12 -26L-12 -26zM-10 -14L10 -14L14 -6L-14 -6z';

/** Angles of a snowflake's three arms and of its six tips. */
export const FLAKE_ARMS = [0, 60, 120];
export const FLAKE_TIPS = [0, 60, 120, 180, 240, 300];
