'use client';

import { useMemo, type ReactNode } from 'react';
import type { QuestSocial } from '@/lib/social/schema';
import { deleteComment, postComment, setLike } from './actions';
import type { SocialActions } from './socialActions';
import { useQuestIntent } from './useQuestIntent';
import { QuestSocialProvider } from './useQuestSocial';
import { useViewerState } from './useViewerState';

// The real Quest page: server actions, and the viewer from /api/quests/{key}/me.

function liveActions(tripKey: string): SocialActions {
  return {
    async setLike(liked, source) {
      const result = await setLike({ tripKey, liked, source });
      if (!result.ok) return result;
      if (!result.data.saved) return { ok: false, error: result.data.error };
      return { ok: true, data: { liked: result.data.liked, likeCount: result.data.likeCount } };
    },
    async postComment(body) {
      const result = await postComment({ tripKey, body });
      if (!result.ok) return result;
      if (!result.data.posted) return { ok: false, error: result.data.error };
      return { ok: true, data: result.data.comment };
    },
    async deleteComment(commentKey) {
      const result = await deleteComment({ commentKey });
      if (!result.ok) return result;
      if (!result.data.deleted) return { ok: false, error: result.data.error };
      return { ok: true, data: null };
    },
  };
}

function FinishIntent() {
  useQuestIntent();
  return null;
}

type Props = { tripKey: string; path: string; initial: QuestSocial; children: ReactNode };

export function LiveSocialProvider({ tripKey, path, initial, children }: Props) {
  const viewer = useViewerState(tripKey);
  const actions = useMemo(() => liveActions(tripKey), [tripKey]);
  return (
    <QuestSocialProvider tripKey={tripKey} path={path} initial={initial} viewer={viewer} actions={actions}>
      <FinishIntent />
      {children}
    </QuestSocialProvider>
  );
}
