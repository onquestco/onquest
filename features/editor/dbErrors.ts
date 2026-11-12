// What a failed save function means for the person (spec A §4.3 error codes). Messages are the
// fixed strings the functions raise, never user text.

type DbError = { code?: string; message?: string } | null;

export type SaveError =
  'conflict' | 'not_found' | 'exists' | 'too_few_photos' | 'too_many_photos' | 'invalid' | 'signed_out';

export function saveError(error: DbError): SaveError | null {
  if (!error) return null;
  switch (error.code) {
    case 'OQ409':
      return 'conflict';
    case 'OQ404':
      return 'not_found';
    case 'OQ410':
      return 'exists';
    case 'OQ401':
      return 'signed_out';
    case 'OQ422':
      if (error.message?.includes('too few photos')) return 'too_few_photos';
      if (error.message?.includes('too many photos')) return 'too_many_photos';
      return 'invalid';
    default:
      return null; // not ours: the caller treats it as an unexpected failure
  }
}
