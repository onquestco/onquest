// Lays out a hand-drawn style "paper map": projects places into an SVG box and places
// name chips beside each pin without overlapping. Pure function so it's easy to test.
// (A tile map with MapLibre can replace this later; see docs/02-lld.md §6.)

export const MAP_WIDTH = 640;
export const MAP_HEIGHT = 800;

const AREA = { left: 220, right: 420, top: 60, bottom: 740 }; // where pins can go
const CHIP_HEIGHT = 34;
const CHIP_GAP = 6;
const LEADER = 24; // distance from pin to chip
const EDGE = 6;

export type MapInput = { name: string; lat: number; lng: number };

export type MapPin = {
  x: number;
  y: number;
  chip: { x: number; y: number; width: number; side: 'left' | 'right' };
};

export const chipWidth = (name: string, index: number) =>
  Math.round(46 + `${index + 1}  ${name}`.length * 9.4);

function project(places: MapInput[]): { x: number; y: number }[] {
  if (places.length === 0) return [];
  const meanLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
  const squash = Math.cos((meanLat * Math.PI) / 180);
  const raw = places.map((p) => ({ x: p.lng * squash, y: -p.lat }));

  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const maxY = Math.max(...raw.map((p) => p.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const areaWidth = AREA.right - AREA.left;
  const areaHeight = AREA.bottom - AREA.top;
  // A zero span (one place, or places in a perfect line) shouldn't limit the scale.
  const fitScale = Math.min(
    spanX > 0 ? areaWidth / spanX : Infinity,
    spanY > 0 ? areaHeight / spanY : Infinity,
  );
  const scale = Number.isFinite(fitScale) ? fitScale : 0;
  const offsetX = AREA.left + (areaWidth - spanX * scale) / 2;
  const offsetY = AREA.top + (areaHeight - spanY * scale) / 2;

  return raw.map((p) => ({
    x: Math.round(offsetX + (p.x - minX) * scale),
    y: Math.round(offsetY + (p.y - minY) * scale),
  }));
}

/** Pushes chips on one side down so they don't overlap, then back up if they run off the bottom. */
function spreadVertically(chips: { index: number; y: number }[]) {
  chips.sort((a, b) => a.y - b.y);
  const step = CHIP_HEIGHT + CHIP_GAP;
  for (let i = 1; i < chips.length; i++) {
    chips[i]!.y = Math.max(chips[i]!.y, chips[i - 1]!.y + step);
  }
  const overflow = (chips.at(-1)?.y ?? 0) + CHIP_HEIGHT / 2 - (MAP_HEIGHT - EDGE);
  if (overflow > 0) chips.forEach((chip) => (chip.y -= overflow));
  for (let i = chips.length - 2; i >= 0; i--) {
    chips[i]!.y = Math.min(chips[i]!.y, chips[i + 1]!.y - step);
  }
}

export function layoutMap(places: MapInput[]): MapPin[] {
  const points = project(places);
  const middle = (AREA.left + AREA.right) / 2;
  const sides = points.map((p): 'left' | 'right' => (p.x <= middle ? 'left' : 'right'));

  const chipY = points.map((p) => p.y);
  for (const side of ['left', 'right'] as const) {
    const chips = points.flatMap((p, index) => (sides[index] === side ? [{ index, y: p.y }] : []));
    spreadVertically(chips);
    chips.forEach((chip) => (chipY[chip.index] = chip.y));
  }

  return points.map((point, index) => {
    const side = sides[index]!;
    const width = chipWidth(places[index]!.name, index);
    const x =
      side === 'left'
        ? Math.max(EDGE, point.x - LEADER - width)
        : Math.min(MAP_WIDTH - EDGE - width, point.x + LEADER);
    return { ...point, chip: { x, y: chipY[index]!, width, side } };
  });
}
