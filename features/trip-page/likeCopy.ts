// What the like button says: the real count from the first like (Swati, 21 Nov 2026 — replaces
// the PRD S3 rule that hid counts below 3).

export function likeLabel(likeCount: number): string {
  if (likeCount === 0) return 'Like';
  return `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`;
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
