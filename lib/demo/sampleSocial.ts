import type { Comment, NotificationItem, QuestSocial, ViewerState } from '@/lib/social/schema';
import { placeholderImage } from './placeholderImages';

// Likes, comments and viewer states for /demo?social=… until the reactions backend (B-05) exists.
// C-08 adds feed samples here.

const comment = (
  index: number,
  name: string,
  handle: string,
  body: string,
  minutesBefore: number,
): Comment => ({
  key: `00000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`,
  body,
  savedAt: new Date(Date.UTC(2026, 10, 9, 18, 0) - minutesBefore * 60_000).toISOString(),
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

const minutesAgo = (minutes: number) =>
  new Date(Date.UTC(2026, 10, 10, 6, 0) - minutes * 60_000).toISOString();
const goa = {
  key: '00000000-0000-4000-8000-0000000000aa',
  title: 'Salt in the Air, Sand in My Hair',
  path: '/demo',
};

/** The bell list for /notifications until B-06 loads the real one. Newest first. */
export const sampleNotifications: NotificationItem[] = [
  {
    key: '00000000-0000-4000-a000-000000000001',
    kind: 'comment',
    savedAt: minutesAgo(4),
    unread: true,
    actor: { handle: 'meera', name: 'Meera Iyer' },
    quest: goa,
    commentExcerpt: 'The route page is so cool 😍',
  },
  {
    key: '00000000-0000-4000-a000-000000000002',
    kind: 'like',
    savedAt: minutesAgo(35),
    unread: true,
    likeCount: 3,
    quest: goa,
  },
  {
    key: '00000000-0000-4000-a000-000000000003',
    kind: 'follow',
    savedAt: minutesAgo(180),
    unread: false,
    actor: { handle: 'kabir_k', name: 'Kabir', avatarUrl: placeholderImage('face', 2) },
  },
  {
    key: '00000000-0000-4000-a000-000000000004',
    kind: 'comment',
    savedAt: minutesAgo(60 * 26),
    unread: false,
    actor: { handle: 'riya', name: 'Riya Shah', avatarUrl: placeholderImage('face', 1) },
    quest: goa,
  },
  {
    key: '00000000-0000-4000-a000-000000000005',
    kind: 'like',
    savedAt: minutesAgo(60 * 50),
    unread: false,
    likeCount: 1,
    quest: goa,
  },
];
