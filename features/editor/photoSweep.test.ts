import { describe, expect, it } from 'vitest';
import { photosToSweep } from './photoSweep';

const now = new Date('2026-11-10T12:00:00Z');

describe('photosToSweep', () => {
  it('deletes photos no longer in the published Quest or the draft', () => {
    const stored = [
      { photoId: 'kept', createdAt: '2026-11-01T00:00:00Z' },
      { photoId: 'removed', createdAt: '2026-11-01T00:00:00Z' },
    ];
    expect(photosToSweep(stored, ['kept'], now)).toEqual(['removed']);
  });

  it('skips anything uploaded in the last hour, or of unknown age', () => {
    const stored = [
      { photoId: 'just-uploaded', createdAt: '2026-11-10T11:30:00Z' },
      { photoId: 'no-date', createdAt: null },
      { photoId: 'an-hour-old', createdAt: '2026-11-10T11:00:00Z' },
    ];
    expect(photosToSweep(stored, [], now)).toEqual(['an-hour-old']);
  });
});
