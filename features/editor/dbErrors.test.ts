import { describe, expect, it } from 'vitest';
import { saveError } from './dbErrors';

describe('saveError', () => {
  it.each([
    [{ code: 'OQ409', message: 'conflict' }, 'conflict'],
    [{ code: 'OQ404', message: 'not found' }, 'not_found'],
    [{ code: 'OQ410', message: 'key already used' }, 'exists'],
    [{ code: 'OQ422', message: 'too few photos' }, 'too_few_photos'],
    [{ code: 'OQ422', message: 'too many photos' }, 'too_many_photos'],
    [{ code: 'OQ422', message: 'invalid title' }, 'invalid'],
  ])('maps %j to %s', (error, expected) => {
    expect(saveError(error)).toBe(expected);
  });

  it('returns null for success and for errors that are not ours', () => {
    expect(saveError(null)).toBeNull();
    expect(saveError({ code: '08006', message: 'connection failure' })).toBeNull();
  });
});
