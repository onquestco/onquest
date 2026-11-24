// Home feed items as /api/feed and getFeedPage return them, for the feed tests.

const owner = { key: '00000000-0000-4000-8000-000000000001', handle: 'riya', name: 'Riya' };

export const feedQuest = (n: number) => ({
  type: 'quest' as const,
  key: `00000000-0000-4000-8000-0000000000a${n}`,
  title: `Quest ${n}`,
  status: 'published' as const,
  visibility: 'public' as const,
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

export const feedBlog = (n: number, change: Record<string, unknown> = {}) => ({
  type: 'blog' as const,
  key: `00000000-0000-4000-8000-0000000000c${n}`,
  title: `Goa on 15k, part ${n}`,
  status: 'published' as const,
  visibility: 'public' as const,
  path: `/@riya/blog/goa-on-15k-${n}`,
  excerpt: 'Three days, one scooter, and the beach shacks that were worth it.',
  photoCount: 0,
  readMinutes: 4,
  placeName: 'Goa',
  likeCount: 3,
  commentCount: 2,
  publishedAt: '2026-11-20T10:00:00Z',
  savedAt: '2026-11-20 10:00:00+00',
  owner,
  likedByMe: true,
  ...change,
});
