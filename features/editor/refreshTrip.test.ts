import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshQuestPages, refreshQuestSocial } from './refreshTrip';

// vi.mock is hoisted above the imports, so refreshTrip gets this updateTag.
const { updateTag } = vi.hoisted(() => ({ updateTag: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag }));

const tags = () => updateTag.mock.calls.map(([tag]) => tag as string);

beforeEach(() => updateTag.mockClear());

describe('refreshQuestPages', () => {
  it("clears the Quest at every URL, the profile, Explore, guides and the owner's blog cards", () => {
    refreshQuestPages({ ownerKey: 'me', tripKey: 't1', handles: ['old', 'new'], slugs: ['goa'] });
    expect(tags().sort()).toEqual(
      [
        'trip-url:old/goa',
        'trip-url:new/goa',
        'profile:me',
        'trip-social:t1',
        'explore',
        'guide-quests',
        'blog-quests:me',
      ].sort(),
    );
  });
});

describe('refreshQuestSocial', () => {
  it('clears only likes and comments', () => {
    refreshQuestSocial('t1');
    expect(tags()).toEqual(['trip-social:t1']);
  });
});
