'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Comment, QuestSocial, ViewerState } from '@/lib/social/schema';
import { toggledLike } from './likeCopy';
import type { LikeSource, SocialActions } from './socialActions';

// One like state for the button under the Quest and the one in full screen, so both always agree.

type Social = {
  tripKey: string;
  path: string;
  viewer: ViewerState;
  liked: boolean;
  likeCount: number;
  commentsOn: boolean;
  comments: Comment[];
  /** Optimistic: the heart changes at once and goes back if the server says no. */
  toggleLike: (source: LikeSource) => void;
  addComment: (comment: Comment) => void;
  dropComment: (commentKey: string) => void;
  restoreComment: (comment: Comment, index: number) => void;
  actions: SocialActions;
};

const SocialContext = createContext<Social | null>(null);

export function useQuestSocial(): Social {
  const social = useContext(SocialContext);
  if (!social) throw new Error('useQuestSocial must be used inside QuestSocialProvider');
  return social;
}

type Props = {
  tripKey: string;
  path: string;
  initial: QuestSocial;
  viewer: ViewerState;
  actions: SocialActions;
  children: ReactNode;
};

export function QuestSocialProvider({ tripKey, path, initial, viewer, actions, children }: Props) {
  const [like, setLikeState] = useState({ liked: viewer.liked, likeCount: initial.likeCount });
  const [comments, setComments] = useState(initial.comments);

  function toggleLike(source: LikeSource) {
    const before = like;
    const after = toggledLike(before);
    setLikeState(after);
    void actions.setLike(after.liked, source).then(
      (result) => setLikeState(result.ok ? result.data : before),
      () => setLikeState(before),
    );
  }

  const value: Social = {
    tripKey,
    path,
    viewer,
    ...like,
    commentsOn: initial.commentsOn,
    comments,
    toggleLike,
    addComment: (comment) => setComments((list) => [...list, comment]),
    dropComment: (key) => setComments((list) => list.filter((comment) => comment.key !== key)),
    restoreComment: (comment, index) =>
      setComments((list) => [...list.slice(0, index), comment, ...list.slice(index)]),
    actions,
  };
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}
