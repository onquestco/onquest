'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Comment, QuestSocial, ViewerState } from '@/lib/social/schema';
import { toggledLike } from './likeCopy';
import type { LikeSource, SocialActions } from './socialActions';

// One like state for the button under the Quest and the one in full screen, so both always agree.

const SIGNED_OUT: ViewerState = { signedIn: false, liked: false, isOwner: false, followingOwner: false };

type Social = {
  tripKey: string;
  path: string;
  /** Signed out until the viewer is known (the cached page can't know who is looking). */
  viewer: ViewerState;
  viewerKnown: boolean;
  liked: boolean;
  likeCount: number;
  commentsOn: boolean;
  comments: Comment[];
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
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
  /** null while it's still loading. */
  viewer: ViewerState | null;
  actions: SocialActions;
  startComposerOpen?: boolean;
  children: ReactNode;
};

export function QuestSocialProvider({
  tripKey,
  path,
  initial,
  viewer,
  actions,
  startComposerOpen = false,
  children,
}: Props) {
  const [like, setLikeState] = useState({ liked: viewer?.liked ?? false, likeCount: initial.likeCount });
  const [comments, setComments] = useState(initial.comments);
  const [composerOpen, setComposerOpen] = useState(startComposerOpen);
  // The viewer arrives after the page: take their like from it once (the count already includes it).
  const [seenViewer, setSeenViewer] = useState(viewer);
  if (viewer !== seenViewer) {
    setSeenViewer(viewer);
    if (viewer) setLikeState((state) => ({ ...state, liked: viewer.liked }));
  }

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
    viewer: viewer ?? SIGNED_OUT,
    viewerKnown: viewer !== null,
    ...like,
    commentsOn: initial.commentsOn,
    comments,
    composerOpen,
    setComposerOpen,
    toggleLike,
    addComment: (comment) => setComments((list) => [...list, comment]),
    dropComment: (key) => setComments((list) => list.filter((comment) => comment.key !== key)),
    restoreComment: (comment, index) =>
      setComments((list) => [...list.slice(0, index), comment, ...list.slice(index)]),
    actions,
  };
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}
