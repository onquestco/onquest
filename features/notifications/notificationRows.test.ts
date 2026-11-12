import { describe, expect, it } from 'vitest';
import { toNotificationItems } from './notificationRows';

describe('toNotificationItems', () => {
  it('reads a follow from someone without a photo (the database leaves avatar_url out)', () => {
    const [item] = toNotificationItems([
      {
        key: '9dfbe06b-05c3-4b71-a47c-ffdf45662999',
        kind: 'follow',
        actor: { name: 'Alok', handle: 'alok' },
        unread: true,
        saved_at: '2026-11-12T13:04:45.356814+00:00',
      },
    ]);
    expect(item?.actor).toEqual({ handle: 'alok', name: 'Alok', avatarUrl: undefined });
  });
});
