// What the like button says. The count stays hidden below 3 so a new Quest doesn't look ignored
// (PRD S3). 1–2 likes follows the recommended answer to F-B1: a filled heart and "Liked" for the
// person who liked it, no number for anyone.

export const SHOW_COUNT_FROM = 3;

export function likeLabel(likeCount: number, liked: boolean): string {
  if (likeCount >= SHOW_COUNT_FROM) return `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`;
  if (liked) return 'Liked';
  if (likeCount === 0) return 'Be the first to like this';
  return 'Like';
}

/** The new state after a tap, before the server answers (rolled back if it fails). */
export function toggledLike(state: { liked: boolean; likeCount: number }) {
  const liked = !state.liked;
  return { liked, likeCount: Math.max(0, state.likeCount + (liked ? 1 : -1)) };
}

/** Shown under the comment box only near the limit, so it doesn't nag. */
export function charactersLeft(text: string, max: number): number | null {
  const left = max - [...text].length;
  return left <= 40 ? left : null;
}
