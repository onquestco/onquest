import { describe, expect, it } from 'vitest';
import { FeedPageSchema } from '@/lib/social/schema';
import { questFeedItems } from './feedItems';

// HomeFeed renders questFeedItems(page.items), on the first page and on "Load more" pages. Until
// BL-05 adds the blog card, a page with blog items must show exactly its Quest cards (blogs spec
// §6.3). The component itself isn't rendered here: unit tests are *.test.ts with no DOM.

const owner = { key: '00000000-0000-4000-8000-000000000001', handle: 'riya', name: 'Riya' };
const quest = (n: number) => ({
  type: 'quest',
  key: `00000000-0000-4000-8000-0000000000a${n}`,
  title: `Quest ${n}`,
  status: 'published',
  visibility: 'public',
  path: `/@riya/quest-${n}`,
  pageCount: 3,
  photoCount: 7,
  places: ['Panjim'],
  likeCount: 1,
  commentCount: 0,
  savedAt: '2026-11-20 10:00:00+00',
  owner,
  likedByMe: false,
});
const blog = {
  type: 'blog',
  key: '00000000-0000-4000-8000-0000000000c1',
  title: 'Goa on 15k',
  status: 'published',
  visibility: 'public',
  path: '/@riya/blog/goa-on-15k',
  excerpt: 'Three days, one scooter.',
  photoCount: 0,
  readMinutes: 4,
  savedAt: '2026-11-20 10:00:00+00',
  owner,
  likedByMe: true,
};

describe('questFeedItems', () => {
  it('keeps the Quest items, in order, and drops the blog items', () => {
    const page = FeedPageSchema.parse({ items: [quest(1), blog, quest(2)], nextOffset: 3, now: '2026-11-24T00:00:00Z' });
    expect(questFeedItems(page.items).map((item) => item.key)).toEqual([quest(1).key, quest(2).key]);
    expect(questFeedItems(page.items).every((item) => item.type === 'quest')).toBe(true);
  });

  it('keeps the same Quest card data as before blogs', () => {
    const page = FeedPageSchema.parse({ items: [quest(1)], nextOffset: null, now: '2026-11-24T00:00:00Z' });
    expect(questFeedItems(page.items)[0]).toMatchObject({ title: 'Quest 1', pageCount: 3, places: ['Panjim'] });
  });

  it('shows nothing (not a broken card) for a page of blogs only', () => {
    const page = FeedPageSchema.parse({ items: [blog], nextOffset: null, now: '2026-11-24T00:00:00Z' });
    expect(questFeedItems(page.items)).toEqual([]);
  });
});
