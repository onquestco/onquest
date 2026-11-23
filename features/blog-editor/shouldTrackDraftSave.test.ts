import { describe, expect, it } from 'vitest';
import { shouldTrackDraftSave } from './shouldTrackDraftSave';

describe('shouldTrackDraftSave', () => {
  it('always counts the create save', () => {
    expect(shouldTrackDraftSave(null, '2026-11-24 10:00:05.123+00')).toBe(true);
  });

  it('skips a save in the same calendar minute', () => {
    expect(shouldTrackDraftSave('2026-11-24 10:00:05.123+00', '2026-11-24 10:00:59.999+00')).toBe(false);
  });

  it('counts the first save in a new minute, even seconds apart', () => {
    expect(shouldTrackDraftSave('2026-11-24 10:00:59.900+00', '2026-11-24 10:01:00.100+00')).toBe(true);
  });

  it('reads Postgres timestamps with any offset', () => {
    expect(shouldTrackDraftSave('2026-11-24 15:30:10+05:30', '2026-11-24 10:00:40+00')).toBe(false);
  });
});
