const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** "My Goa Trip 2026!" → "my-goa-trip-2026". Falls back to "trip" if nothing is left. */
export function slugify(text: string, maxLength = 60): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || 'trip';
}

/** Random token used to make unlisted URLs unguessable (36^length combinations). */
export function randomToken(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length]).join('');
}

/** Unlisted trips get a random suffix so their URL can't be guessed: "goa-2026-k3f9x2". */
export function unlistedSlug(base: string): string {
  return `${slugify(base, 70)}-${randomToken()}`;
}
