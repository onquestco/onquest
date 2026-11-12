import type { ActionResult } from '@/lib/action';
import type { Comment } from '@/lib/social/schema';

// What the Quest page needs from the server. B-05 passes the real server actions; until then
// /demo passes sampleSocialActions, which answer after a short wait like a network would.

export type LikeSource = 'quest_page' | 'fullscreen' | 'feed' | 'after_sign_in';

export type SocialActions = {
  setLike: (
    liked: boolean,
    source: LikeSource,
  ) => Promise<ActionResult<{ liked: boolean; likeCount: number }>>;
  postComment: (body: string) => Promise<ActionResult<Comment>>;
  deleteComment: (commentKey: string) => Promise<ActionResult<null>>;
};

/** Sign-in link that brings the person back to this Quest to finish what they tapped (spec A §3.2). */
export function signInPath(intent: 'like' | 'comment' | 'make_your_own', next: string, tripKey?: string) {
  const params = new URLSearchParams({ next, intent });
  if (tripKey) params.set('ref', tripKey);
  return `/login?${params.toString()}`;
}
