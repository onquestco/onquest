import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '@/lib/social/schema';
import { notificationHref, notificationText, timeAgo } from './notificationText';

const quest = { key: '00000000-0000-4000-8000-0000000000aa', title: 'Goa trip', path: '/@riya/goa-trip' };
const base = {
  key: '00000000-0000-4000-a000-000000000001',
  savedAt: '2026-11-10T06:00:00.000Z',
  unread: true,
};

describe('notificationText', () => {
  it('never names who liked', () => {
    expect(notificationText({ ...base, kind: 'like', likeCount: 1, quest })).toBe('Someone liked Goa trip');
    expect(notificationText({ ...base, kind: 'like', likeCount: 3, quest })).toBe('3 people liked Goa trip');
  });
  it('quotes the comment, or says only that there was one once it is deleted', () => {
    const actor = { handle: 'meera', name: 'Meera' };
    expect(notificationText({ ...base, kind: 'comment', actor, quest, commentExcerpt: 'So cool' })).toBe(
      'Meera commented on Goa trip: "So cool"',
    );
    expect(notificationText({ ...base, kind: 'comment', actor, quest })).toBe(
      'Meera commented on your Quest',
    );
  });
  it('names the new follower', () => {
    expect(notificationText({ ...base, kind: 'follow', actor: { handle: 'kabir', name: 'Kabir' } })).toBe(
      'Kabir started following you',
    );
  });
});

describe('notificationHref', () => {
  it('opens comments at the comments, likes at the Quest, follows at the profile', () => {
    const comment: NotificationItem = { ...base, kind: 'comment', quest };
    expect(notificationHref(comment)).toBe('/@riya/goa-trip#comments');
    expect(notificationHref({ ...base, kind: 'like', quest })).toBe('/@riya/goa-trip');
    expect(notificationHref({ ...base, kind: 'follow', actor: { handle: 'kabir', name: 'Kabir' } })).toBe(
      '/@kabir',
    );
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-10T06:00:00.000Z');
  it('counts up in minutes, hours and days, then shows the date', () => {
    expect(timeAgo('2026-11-10T05:59:40.000Z', now)).toBe('Just now');
    expect(timeAgo('2026-11-10T05:56:00.000Z', now)).toBe('4m');
    expect(timeAgo('2026-11-10T03:00:00.000Z', now)).toBe('3h');
    expect(timeAgo('2026-11-08T06:00:00.000Z', now)).toBe('2d');
    expect(timeAgo('2026-10-20T06:00:00.000Z', now)).toBe('20 Oct');
  });
});
