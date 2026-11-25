import { describe, expect, it } from 'vitest';
import { FeedPageSchema } from '@/lib/social/schema';
import { appendFeedPage } from './feedItems';
import { feedBlog, feedQuest } from './feedFixture';

// HomeFeed shows every item of the first page and appends "Load more" pages with appendFeedPage:
// Quests and blogs together, in the server's order (blogs spec S2). BL-02's blog filter is gone.

const page = (items: unknown[]) =>
  FeedPageSchema.parse({ items, nextOffset: null, now: '2026-11-24T00:00:00Z' }).items;

describe('appendFeedPage', () => {
  it('keeps Quests and blogs in the order they came', () => {
    const shown = page([feedQuest(1), feedBlog(1)]);
    const next = page([feedQuest(2), feedBlog(2)]);
    expect(appendFeedPage(shown, next).map((item) => [item.type, item.key])).toEqual([
      ['quest', feedQuest(1).key],
      ['blog', feedBlog(1).key],
      ['quest', feedQuest(2).key],
      ['blog', feedBlog(2).key],
    ]);
  });

  it('skips items already on screen (scores move between pages)', () => {
    const shown = page([feedQuest(1), feedBlog(1)]);
    const next = page([feedBlog(1), feedQuest(2)]);
    expect(appendFeedPage(shown, next).map((item) => item.key)).toEqual([
      feedQuest(1).key,
      feedBlog(1).key,
      feedQuest(2).key,
    ]);
  });

  it('keeps the same Quest card data as before blogs', () => {
    expect(appendFeedPage([], page([feedQuest(1)]))[0]).toMatchObject({ title: 'Quest 1', pageCount: 3, places: ['Panjim'] });
  });
});
