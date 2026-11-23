// What a failed blog save function means for the person (migration 16 error codes). Messages are
// the fixed strings the functions raise, never user text.

type DbError = { code?: string; message?: string } | null;

export type BlogSaveError =
  | 'conflict'
  | 'not_found'
  | 'exists'
  | 'no_access'
  | 'too_many_photos'
  | 'too_long'
  | 'empty'
  | 'invalid_visibility'
  | 'not_published'
  | 'invalid'
  | 'signed_out';

const INVALID_MESSAGES: [string, BlogSaveError][] = [
  ['too many photos', 'too_many_photos'],
  ['too long', 'too_long'],
  ['empty', 'empty'],
  ['invalid visibility', 'invalid_visibility'],
  ['not published', 'not_published'],
];

export function blogSaveError(error: DbError): BlogSaveError | null {
  if (!error) return null;
  switch (error.code) {
    case 'OQ409':
      return 'conflict';
    case 'OQ404':
      return 'not_found';
    case 'OQ410':
      return 'exists';
    case 'OQ403':
      return 'no_access';
    case 'OQ401':
      return 'signed_out';
    case 'OQ422':
      return INVALID_MESSAGES.find(([message]) => error.message === message)?.[1] ?? 'invalid';
    default:
      return null; // not ours: the caller treats it as an unexpected failure
  }
}
