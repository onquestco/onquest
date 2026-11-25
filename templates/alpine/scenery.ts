// Shapes for the Mountain backgrounds, ported from the design's ridge(), pineRow(), bgSunrise() and
// bgNight() in docs/reference/templates/mountain.html. Everything is in the design's 390 × 650 box.
// Pure and seeded by the page, so a page always draws the same peaks (no Math.random()).

export const WIDTH = 390;
export const HEIGHT = 650;

const round = (value: number) => Math.round(value * 10) / 10;

/** The design's rng(): a small seeded generator, kept as is so the peaks match the design. */
export function designRandom(start: number): () => number {
  let state = start;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

export type Ridge = { area: string; line: string; snowCaps: string[] };

/** A mountain range: alternating peaks and saddles across the page, with snow on the high peaks. */
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

/** A row of pine trees standing on the line y; `scale` makes the row taller. */
export function pineRow(y: number, count: number, scale: number, seed: number): string[] {
  const random = designRandom(seed * 31 + 5);
  return Array.from({ length: count }, (_, index) => {
    const x = -10 + (410 / count) * index + random() * 14;
    const height = (54 + random() * 34) * scale;
    const half = height * 0.46;
    const at = (dx: number, dy: number) => `${round(x + half * dx)} ${round(y - height * dy)}`;
    return (
      `M${at(0, 1)}L${at(0.5, 0.52)}H${round(x + half * 0.22)}L${at(0.62, 0.2)}H${round(x + half * 0.3)}` +
      `L${at(0.7, 0)}H${round(x - half * 0.7)}L${at(-0.3, 0.2)}H${round(x - half * 0.62)}` +
      `L${at(-0.22, 0.52)}H${round(x - half * 0.5)}z`
    );
  });
}

/** Stars in the night sky's upper part: bigger stars are brighter. */
export function stars(seed: number) {
  const random = designRandom(seed * 7 + 1);
  return Array.from({ length: 70 }, () => {
    const x = Math.round(random() * WIDTH);
    const y = Math.round(random() * 380);
    const size = random();
    return { x, y, radius: round(0.6 + size * 1.3), opacity: Math.round((0.4 + size * 0.6) * 100) / 100 };
  });
}

const CLOUD_BANKS = [
  [80, 210, 70],
  [300, 250, 80],
  [190, 330, 90],
  [330, 360, 60],
] as const;

/** Thin cloud streaks across the sunrise sky. */
export function clouds(seed: number) {
  const random = designRandom(seed * 13 + 2);
  return CLOUD_BANKS.map(([x, y, width]) => ({ x, y, width, height: round(8 + random() * 4) }));
}

/** The scalloped green band along the top of mist and forest pages. */
export const BAND_CLIP = 'M0 0H390V38Q357 56 325 38T260 38T195 38T130 38T65 38T0 38Z';
export const BAND_EDGE = 'M0 38Q33 56 65 38T130 38T195 38T260 38T325 38T390 38';

export type Bird = { x: number; y: number; scale: number; rotate: number };

export const birdTransform = ({ x, y, scale, rotate }: Bird) =>
  `translate(${x} ${y}) rotate(${rotate}) scale(${scale})`;
export const BIRD_PATH = 'M-14 2Q-8 -8 0 0Q8 -8 14 2Q8 -3 0 4Q-8 -3 -14 2z';
