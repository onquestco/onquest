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

  it('covers own blogs under every handle, blogs they reacted to and linked-Quest cards', () => {
    const tags = tagsToRefresh('me', {
      liked_or_commented_trip_keys: [],
      follow_profile_keys: [],
      own_trips: [],
      handles: ['old', 'new'],
      own_blogs: [{ key: 'b1', slug: 'goa-on-15k' }],
      liked_or_commented_blog_keys: ['b2'],
    });
    for (const tag of [
      'blog-url:old/goa-on-15k',
      'blog-url:new/goa-on-15k',
      'blog-social:b1',
      'blog-social:b2',
      'blog-quests:me',
    ]) {
      expect(tags).toContain(tag);
    }
  });

  it('works with what an older delete_account_data returns (no blog fields)', () => {
    const tags = tagsToRefresh('me', {
      liked_or_commented_trip_keys: [],
      follow_profile_keys: [],
      own_trips: [],
      handles: ['me'],
    });
    expect(tags.filter((tag) => tag.startsWith('blog-url:') || tag.startsWith('blog-social:'))).toEqual([]);
  });
});
