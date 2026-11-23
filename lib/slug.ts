const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Paths under /@handle that are pages, not Quests (spec C §4.4): a Quest titled "Followers" must
 * not hide the followers list. `blog` keeps /@handle/blog free for a future blog index (blogs
 * spec §3.3); Quests that already have that slug keep it.
 */
export const RESERVED_SLUGS = new Set(['followers', 'following', 'blog']);

/**
 * "My Goa Trip 2026!" → "my-goa-trip-2026". Falls back to `fallback` if nothing is left (titles
 * in non-Latin scripts): "trip" for Quests, "blog" for blogs. `reserved` are the Quest-level
 * page names; blogs live one level down (/@h/blog/…) and pass none.
 */
export function slugify(
  text: string,
  maxLength = 60,
  fallback = 'trip',
  reserved: ReadonlySet<string> = RESERVED_SLUGS,
): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  if (!slug) return fallback;
  return reserved.has(slug) ? `${slug}-trip` : slug;
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
