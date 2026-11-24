import { describe, expect, it } from 'vitest';
import type { ProfileView } from './getProfile';
import { profileMetadata } from './metadata';

const blogCard = {
  key: '00000000-0000-4000-8000-000000000020',
  title: 'Goa on 15k',
  status: 'published' as const,
  visibility: 'public' as const,
  path: '/@riya/blog/goa-on-15k',
  excerpt: 'We stayed in Anjuna.',
  photoCount: 0,
  readMinutes: 1,
  likeCount: 0,
  commentCount: 0,
  savedAt: '2026-11-20 10:00:00+00',
  owner: { key: '00000000-0000-4000-8000-000000000001', handle: 'riya', name: 'Riya' },
};

const profile = (quests: number, blogs: (typeof blogCard)[] = []): ProfileView => ({
  key: '00000000-0000-4000-8000-000000000001',
  handle: 'riya',
  name: 'Riya',
  bio: undefined,
  homeCity: undefined,
  avatarUrl: undefined,
  stats: { quests, trips: quests, followers: 0, following: 0, places: 0, countries: 0, days: 0 },
  places: ['Goa'],
  pins: [],
  quests: [],
  blogs, // public blogs only (get_profile)
});

describe('profileMetadata', () => {
  it('indexes a profile only once it has a public Quest', () => {
    expect(profileMetadata(profile(0)).robots).toEqual({ index: false, follow: true });
    expect(profileMetadata(profile(2)).robots).toEqual({ index: true, follow: true });
  });

  it('indexes a profile with a public blog and no public Quest (blogs D9)', () => {
    expect(profileMetadata(profile(0, [blogCard])).robots).toEqual({ index: true, follow: true });
  });

  it('describes it with the Quest count and places when there is no bio', () => {
    expect(profileMetadata(profile(2)).description).toBe('2 Quests on OnQuest: Goa');
  });
});
