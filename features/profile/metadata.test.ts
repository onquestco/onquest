import { describe, expect, it } from 'vitest';
import type { ProfileView } from './getProfile';
import { profileMetadata } from './metadata';

const profile = (quests: number): ProfileView => ({
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
});

describe('profileMetadata', () => {
  it('indexes a profile only once it has a public Quest', () => {
    expect(profileMetadata(profile(0)).robots).toEqual({ index: false, follow: true });
    expect(profileMetadata(profile(2)).robots).toEqual({ index: true, follow: true });
  });

  it('describes it with the Quest count and places when there is no bio', () => {
    expect(profileMetadata(profile(2)).description).toBe('2 Quests on OnQuest: Goa');
  });
});
