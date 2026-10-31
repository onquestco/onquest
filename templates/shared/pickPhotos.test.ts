import { describe, expect, it } from 'vitest';
import type { Photo } from '@/lib/trip/types';
import { pickPhoto, uniquePhotos } from './pickPhotos';

const make = (id: string, width: number, height: number): Photo => ({
  id,
  width,
  height,
  thumb: `${id}.webp`,
  display: `${id}.webp`,
});

const tall = make('tall', 600, 800);
const wide = make('wide', 800, 600);
const tall2 = make('tall2', 600, 900);

describe('pickPhoto', () => {
  it('prefers the requested shape', () => {
    expect(pickPhoto([tall, wide], 'wide', new Set())?.id).toBe('wide');
  });

  it('falls back to any unused photo when no shape matches', () => {
    expect(pickPhoto([tall, tall2], 'wide', new Set())?.id).toBe('tall');
  });

  it('never repeats a photo', () => {
    const used = new Set<string>();
    const picks = [pickPhoto([tall, wide], 'any', used), pickPhoto([tall, wide], 'any', used)];
    expect(picks.map((p) => p?.id)).toEqual(['tall', 'wide']);
    expect(pickPhoto([tall, wide], 'any', used)).toBeUndefined();
  });

  it('handles an empty pool', () => {
    expect(pickPhoto([], 'tall', new Set())).toBeUndefined();
  });
});

describe('uniquePhotos', () => {
  it('drops duplicates and missing photos', () => {
    expect(uniquePhotos([tall, undefined, tall, wide]).map((p) => p.id)).toEqual(['tall', 'wide']);
  });
});
