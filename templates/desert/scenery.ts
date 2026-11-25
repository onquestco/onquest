// Shapes for the Desert backgrounds and stickers, ported from the design's helpers (rng, stars, dune,
// sparkle, moon, palm, camel, cactus) in docs/reference/templates/desert.md and roadtrip.html.
// Everything is in the design's 390 × 650 box. Pure and seeded by the page, so a page always draws
// the same scenery (no Math.random()).

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

export type Star = { x: number; y: number; radius: number; opacity: number };

/** Stars above `maxY`: bigger stars are brighter. */
export function stars(count: number, seed: number, maxY: number): Star[] {
  const random = designRandom(seed * 7 + 1);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * WIDTH);
    const y = Math.round(random() * maxY);
    const size = random();
    return { x, y, radius: round(0.6 + size * 1.3), opacity: round2(0.4 + size * 0.6) };
  });
}

/**
 * The design's dune(): one rolling ridge of sand from edge to edge, filled down to the bottom.
 * `shift` slides its crest left or right, so stacked dunes don't line up.
 */
export function dune(y: number, amplitude: number, shift = 0): string {
  const crest = y - amplitude;
  return (
    `M-10 ${y}C${60 + shift} ${crest},${140 + shift} ${crest},${210 + shift} ${y}` +
    `S340 ${round(y + amplitude * 0.3)} 400 ${round(y - amplitude * 0.6)}V650H-10Z`
  );
}

/** "translate(x y) scale(s)", the design's way of placing every shape. */
export const place = (x: number, y: number, scale: number) => `translate(${x} ${y}) scale(${scale})`;

/** A four-pointed sparkle, 24 units across. */
export const SPARKLE = 'M0 -12Q2 -2 12 0Q2 2 0 12Q-2 2 -12 0Q-2 -2 0 -12z';

/** A crescent moon, 40 units tall. */
export const MOON = 'M10 -20A22 22 0 1 0 10 20A17 17 0 1 1 10 -20z';

/** The palm's trunk, from its foot up to the crown at (8, -104). */
export const PALM_TRUNK = 'M0 0C4 -40 2 -70 8 -104';

/** Palm fronds around the crown: the background palm has all five, the sticker the first three. */
export const PALM_FRONDS = [
  'M0 0C-16 -18 -38 -16 -52 -2C-34 -6 -16 -6 0 0z',
  'M0 0C16 -18 38 -16 52 -2C34 -6 16 -6 0 0z',
  'M0 0C-8 -26 2 -40 20 -44C12 -30 8 -16 0 0z',
  'M0 0C-24 -4 -40 8 -44 24C-28 12 -14 8 0 0z',
  'M0 0C22 -4 38 8 42 24C26 12 12 8 0 0z',
];

/** A camel walking left, its feet at y 22. */
export const CAMEL =
  'M-22 -14C-16 -26 -8 -26 -2 -14C4 -24 10 -22 12 -12L20 -26L24 -24L18 -8C20 0 16 6 14 6V22H10V8H-4V22H-8V8H-16V22H-20V4C-24 0 -24 -8 -22 -14z';

/** The background cactus's two arms (its trunk is a rounded rect). */
export const CACTUS_ARMS = 'M-4 -18H-12A4 4 0 0 1 -16 -22V-30H-12V-22H-4zM4 -24H12A4 4 0 0 0 16 -28V-36H12V-28H4z';

/** The sticker cactus's arms: the same shape, a little chunkier. */
export const STICKER_CACTUS_ARMS =
  'M-5 -18H-12A4 4 0 0 1 -16 -22V-30H-10V-24H-5zM5 -24H12A4 4 0 0 0 16 -28V-36H10V-30H5z';

/** The sun sticker's eight rays, as the design draws them (k × 45°, from radius 24 to 33). */
export function sunRays(): string[] {
  return Array.from({ length: 8 }, (_, k) => {
    const angle = (k * Math.PI) / 4;
    const point = (radius: number) =>
      `${(Math.cos(angle) * radius).toFixed(1)} ${(Math.sin(angle) * radius).toFixed(1)}`;
    return `M${point(24)} L${point(33)}`;
  });
}
