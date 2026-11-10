import { describe, expect, it } from 'vitest';
import { fitWithin } from './imageSize';

describe('fitWithin', () => {
  it('scales a landscape photo by its width', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('scales a portrait photo by its height', () => {
    expect(fitWithin(3000, 4000, 400)).toEqual({ width: 300, height: 400 });
  });

  it('never enlarges', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
