import { describe, expect, it } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { layoutMap, MAP_HEIGHT, MAP_WIDTH } from './mapLayout';

const overlaps = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) < 34;

describe('layoutMap', () => {
  it('returns nothing for no places', () => expect(layoutMap([])).toEqual([]));

  it('centres a single place', () => {
    const [pin] = layoutMap([{ name: 'Goa', lat: 15.5, lng: 73.8 }]);
    expect(pin).toMatchObject({ x: 320, y: 400 });
  });

  it('keeps every pin and chip inside the map', () => {
    for (const pin of layoutMap(goaTrip.places)) {
      expect(pin.x).toBeGreaterThanOrEqual(0);
      expect(pin.x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(pin.chip.x).toBeGreaterThanOrEqual(0);
      expect(pin.chip.x + pin.chip.width).toBeLessThanOrEqual(MAP_WIDTH);
      expect(pin.chip.y).toBeGreaterThan(0);
      expect(pin.chip.y).toBeLessThan(MAP_HEIGHT);
    }
  });

  it('never overlaps chips on the same side', () => {
    const pins = layoutMap(goaTrip.places);
    for (const a of pins) {
      for (const b of pins) {
        if (a !== b && a.chip.side === b.chip.side) expect(overlaps(a.chip, b.chip)).toBe(false);
      }
    }
  });

  it('puts north above south', () => {
    const [north, south] = layoutMap([
      { name: 'North', lat: 16, lng: 74 },
      { name: 'South', lat: 15, lng: 74 },
    ]);
    expect(north!.y).toBeLessThan(south!.y);
  });
});
