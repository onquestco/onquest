import { describe, expect, it } from 'vitest';
import { tagsToRefresh } from './deletionTags';

describe('tagsToRefresh', () => {
  it('covers reacted Quests, follows, and own pages under every handle', () => {
    const tags = tagsToRefresh('me', {
      liked_or_commented_trip_keys: ['t1'],
      follow_profile_keys: ['p1'],
      own_trips: [{ key: 'q1', slug: 'goa' }],
      handles: ['old', 'new'],
    });
    for (const tag of [
      'trip-social:t1',
      'profile:p1',
      'profile:me',
      'profile-url:old',
      'profile-url:new',
      'trip-url:old/goa',
      'trip-url:new/goa',
      'trip-social:q1',
      'explore',
      'guide-quests',
    ]) {
      expect(tags).toContain(tag);
    }
    expect(new Set(tags).size).toBe(tags.length);
  });
});
