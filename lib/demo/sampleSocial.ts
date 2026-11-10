import type { Comment, QuestSocial, ViewerState } from '@/lib/social/schema';
import { placeholderImage } from './placeholderImages';

// Likes, comments and viewer states for /demo?social=… until the reactions backend (B-05) exists.
// C-08 adds feed samples here.

const comment = (index: number, name: string, handle: string, body: string, minutesAgo: number): Comment => ({
  key: `00000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`,
  body,
  savedAt: new Date(Date.UTC(2026, 10, 9, 18, 0) - minutesAgo * 60_000).toISOString(),
  author: {
    key: `00000000-0000-4000-9000-0000000000${String(index).padStart(2, '0')}`,
    name,
    handle,
    avatarUrl: index % 2 ? placeholderImage('face', index) : undefined,
  },
});

const comments = [
  comment(1, 'Riya Shah', 'riya', 'That sunset photo! Which beach was this?', 180),
  comment(2, 'Kabir', 'kabir_k', 'Taking notes for December.\nDid you rent a scooter?', 95),
  comment(3, 'Meera Iyer', 'meera', 'The route page is so cool 😍', 12),
];

export const sampleSocial = {
  /** No likes, no comments yet. */
  none: { likeCount: 0, commentCount: 0, commentsOn: true, comments: [] },
  /** Two likes: no number shown yet (F-B1). */
  few: { likeCount: 2, commentCount: 1, commentsOn: true, comments: comments.slice(0, 1) },
  many: { likeCount: 24, commentCount: 3, commentsOn: true, comments },
  off: { likeCount: 7, commentCount: 3, commentsOn: false, comments: [] },
} satisfies Record<string, QuestSocial>;

export type SampleSocialName = keyof typeof sampleSocial;

export const sampleViewers = {
  signedOut: { signedIn: false, liked: false, isOwner: false, followingOwner: false },
  friend: { signedIn: true, liked: false, isOwner: false, followingOwner: false },
  owner: { signedIn: true, liked: false, isOwner: true, followingOwner: false },
} satisfies Record<string, ViewerState>;

export type SampleViewerName = keyof typeof sampleViewers;
