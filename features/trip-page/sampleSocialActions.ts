import type { Comment } from '@/lib/social/schema';
import type { SocialActions } from './socialActions';

const pause = () => new Promise((resolve) => setTimeout(resolve, 400));

/** Fake server for /demo: keeps a like count per page visit and echoes comments back. */
export function sampleSocialActions(startCount: number, viewer: { name: string; handle: string }): SocialActions {
  let likeCount = startCount;
  let liked = false;
  return {
    async setLike(wanted) {
      await pause();
      if (wanted !== liked) likeCount += wanted ? 1 : -1;
      liked = wanted;
      return { ok: true, data: { liked, likeCount } };
    },
    async postComment(body) {
      await pause();
      const comment: Comment = {
        key: crypto.randomUUID(),
        body,
        savedAt: new Date().toISOString(),
        author: { key: crypto.randomUUID(), name: viewer.name, handle: viewer.handle },
      };
      return { ok: true, data: comment };
    },
    async deleteComment() {
      await pause();
      return { ok: true, data: null };
    },
  };
}
