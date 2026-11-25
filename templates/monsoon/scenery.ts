// Shapes for the Monsoon backgrounds, ported from the design's helpers (rng, cloud, band, drop,
// rain, drops, bolt, umbrellaSvg, leaf) in docs/reference/templates/monsoon.md and roadtrip.html.
// Everything is in the design's 390 × 650 box. Pure and seeded by the page, so a page always draws
// the same rain (no Math.random()).

export const WIDTH = 390;
export const HEIGHT = 650;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The design's rng(): a small seeded generator, kept as is so the scenery matches the design. */
export function designRandom(start: number): () => number {
  let state = start;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/**
 * The design's band(): a wavy strip of cut paper, hanging from the top edge or rising from the
 * bottom edge. `offset` slides the waves sideways so stacked bands don't line up.
 */
export function band(y: number, amplitude: number, edge: 'top' | 'bottom', offset = 0): string {
  const waves =
    `M-60 ${y}Q${-20 + offset} ${y - amplitude} ${30 + offset} ${y}` +
    `T${190 + offset} ${y}T${290 + offset} ${y}T${390 + offset} ${y}T${490 + offset} ${y}`;
  return `${waves}${edge === 'top' ? 'V-20' : 'V670'}H-60Z`;
}

/** One streak of rain from the design's rain(): a short slanted line. */
export type Streak = { x: number; y: number };

/** The design's rain(): `count` slanted streaks spread over the page. */
export function rain(count: number, seed: number): Streak[] {
  const random = designRandom(seed * 13 + 4);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * 400);
    const y = Math.round(random() * 620);
    return { x, y };
  });
}

export type Drop = { x: number; y: number; scale: number };

/** The design's drops(): `count` raindrops of different sizes, kept off the very top of the page. */
export function drops(count: number, seed: number): Drop[] {
  const random = designRandom(seed * 17 + 2);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * 370 + 10);
    const y = Math.round(random() * 560 + 60);
    return { x, y, scale: round2(0.7 + random() * 0.8) };
  });
}

/** `translate(x y) rotate(r) scale(s)`, the transform the design puts on every shape. */
export const place = (x: number, y: number, scale: number, rotate = 0) =>
  rotate ? `translate(${x} ${y}) rotate(${rotate}) scale(${scale})` : `translate(${x} ${y}) scale(${scale})`;

export const STREAK = 'l-6 22';
export const CLOUD_PATH = 'M-34 14a14 14 0 0 1 2-28 20 20 0 0 1 38-4 16 16 0 0 1 8 32z';
export const DROP_PATH = 'M0 -9C5 -2 7 2 7 5A7 7 0 0 1 -7 5C-7 2 -5 -2 0 -9z';
export const BOLT_PATH = 'M12 0L-8 34H4L-6 66L22 24H8L18 0z';
export const LEAF_PATH = 'M0 -20C16 -10 16 10 0 20C-16 10 -16 -10 0 -20z';
export const UMBRELLA_CANOPY = 'M-34 0A34 34 0 0 1 34 0Q24 -6 17 0Q10 -6 0 0Q-10 -6 -17 0Q-24 -6 -34 0z';
export const UMBRELLA_HANDLE = 'M0 0V34Q0 42 8 42';
