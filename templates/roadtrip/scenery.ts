// Shapes for the Roadtrip backgrounds, ported from the design's helpers (ridge, stars, cloud, bird,
// scallop, plane, road, tree, fly) in docs/reference/templates/roadtrip.html. Everything is in the
// design's 390 × 650 box. Pure and seeded by the page, so a page always draws the same scenery
// (no Math.random()).

export const WIDTH = 390;
export const HEIGHT = 650;

const round = (value: number) => Math.round(value * 10) / 10;

/** The design's rng(): a small seeded generator, kept as is so the scenery matches the design. */
export function designRandom(start: number): () => number {
  let state = start;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

export type Ridge = { area: string; line: string; snowCaps: string[] };

/** A range of hills or peaks across the page, with snow on the high peaks when asked. */
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
  return { area: `M-10 ${HEIGHT} L${path} L400 ${HEIGHT}Z`, line: `M${path}`, snowCaps };
}

export type Star = { x: number; y: number; radius: number; opacity: number };

/** Stars above `maxY`: bigger stars are brighter. */
export function stars(count: number, seed: number, maxY: number): Star[] {
  const random = designRandom(seed * 7 + 1);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * WIDTH);
    const y = Math.round(random() * maxY);
    const size = random();
    return { x, y, radius: round(0.6 + size * 1.3), opacity: Math.round((0.4 + size * 0.6) * 100) / 100 };
  });
}

export type Tree = { x: number; y: number; scale: number; color: string };

const TREE_COLORS = ['#2F7D45', '#3E9A52', '#8ED16B'] as const;

/** The nine round trees scattered over the green hills, in the design's draw order. */
export function hillTrees(seed: number): Tree[] {
  const random = designRandom(seed * 11 + 3);
  return Array.from({ length: 9 }, () => {
    const x = round(random() * 370 + 10);
    const y = round(500 + random() * 110);
    const scale = round(0.9 + random() * 0.6);
    const color = TREE_COLORS[Math.floor(random() * 3)] ?? TREE_COLORS[0];
    return { x, y, scale, color };
  });
}

/** Points of the design's scalloped sun: `count` small circles around a big one. */
export function scallopDots(count: number, radius: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * Math.PI * 2) / count;
    return { cx: round(Math.cos(angle) * radius), cy: round(Math.sin(angle) * radius) };
  });
}

export const CLOUD_PATH = 'M-34 14a14 14 0 0 1 2-28 20 20 0 0 1 38-4 16 16 0 0 1 8 32z';
export const BIRD_PATH = 'M-14 2Q-8 -8 0 0Q8 -8 14 2Q8 -3 0 4Q-8 -3 -14 2z';
export const PLANE_PATH = 'M-50 4L8 0L-12 -22L-4 -22L22 -2L48 -4Q56 0 48 4L22 6L-4 26L-12 26L8 8L-50 6z';
export const WING_LEFT = 'M0 0C-14 -16 -22 -4 -10 4C-20 8 -12 20 0 8z';
export const WING_RIGHT = 'M0 0C14 -16 22 -4 10 4C20 8 12 20 0 8z';

/** The road along the bottom of day, sunset and night pages, with its dashed centre line. */
export const ROAD = 'M-10 650V610Q195 560 400 610V650z';
export const ROAD_LINE = 'M-10 632Q195 586 400 632';

/** The winding dirt track up the hills page. */
export const TRACK = 'M170 650Q230 600 190 570Q150 540 220 500';

export const place = (x: number, y: number, scale: number, rotate = 0) =>
  `translate(${x} ${y}) rotate(${rotate}) scale(${scale})`;
