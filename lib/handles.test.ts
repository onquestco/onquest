import { describe, expect, it } from 'vitest';
import { HandleSchema, isReservedHandle } from './handles';

describe('HandleSchema', () => {
  it('lowercases and trims', () => {
    expect(HandleSchema.parse('  Swati_01 ')).toBe('swati_01');
  });

  it.each(['ab', 'a'.repeat(21), 'has space', 'dash-ed', 'émile', ''])('rejects %j', (handle) => {
    expect(HandleSchema.safeParse(handle).success).toBe(false);
  });
});

describe('isReservedHandle', () => {
  it('blocks route names and the product name', () => {
    expect(isReservedHandle('login')).toBe(true);
    expect(isReservedHandle('onquest')).toBe(true);
  });

  it('allows normal handles', () => {
    expect(isReservedHandle('swati')).toBe(false);
  });
});
