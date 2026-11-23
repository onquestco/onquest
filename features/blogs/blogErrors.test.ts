import { describe, expect, it } from 'vitest';
import { blogSaveError } from './blogErrors';

describe('blogSaveError', () => {
  it('maps the codes migration 16 raises', () => {
    expect(blogSaveError(null)).toBeNull();
    expect(blogSaveError({ code: 'OQ409', message: 'conflict' })).toBe('conflict');
    expect(blogSaveError({ code: 'OQ404', message: 'not found' })).toBe('not_found');
    expect(blogSaveError({ code: 'OQ410', message: 'key already used' })).toBe('exists');
    expect(blogSaveError({ code: 'OQ403', message: 'no access' })).toBe('no_access');
    expect(blogSaveError({ code: 'OQ401', message: 'not signed in' })).toBe('signed_out');
  });

  it('tells the OQ422 cases apart by their fixed message', () => {
    expect(blogSaveError({ code: 'OQ422', message: 'too many photos' })).toBe('too_many_photos');
    expect(blogSaveError({ code: 'OQ422', message: 'too long' })).toBe('too_long');
    expect(blogSaveError({ code: 'OQ422', message: 'empty' })).toBe('empty');
    expect(blogSaveError({ code: 'OQ422', message: 'invalid visibility' })).toBe('invalid_visibility');
    expect(blogSaveError({ code: 'OQ422', message: 'not published' })).toBe('not_published');
    expect(blogSaveError({ code: 'OQ422', message: 'invalid slug' })).toBe('invalid');
  });

  it("leaves errors that aren't ours to the caller", () => {
    expect(blogSaveError({ code: '23505', message: 'duplicate key' })).toBeNull();
  });
});
