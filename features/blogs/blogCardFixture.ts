import type { BlogCard } from '@/lib/blog/cards';

// A blog card (profile, Quests tab, Explore, search) for the list tests.

export function blogCardFixture(n: number, change: Partial<BlogCard> = {}): BlogCard {
  return {
    key: `00000000-0000-4000-8000-0000000000d${n}`,
    title: `Goa on 15k, part ${n}`,
    status: 'published',
    visibility: 'public',
    path: `/@riya/blog/goa-on-15k-${n}`,
    excerpt: 'We stayed in Anjuna and rented a scooter.',
    photoCount: 0,
    readMinutes: 4,
    likeCount: 2,
    commentCount: 1,
    publishedAt: '2026-11-20T10:00:00Z',
    savedAt: '2026-11-20 10:00:00+00',
    commentsOn: true,
    owner: { key: '00000000-0000-4000-8000-000000000001', handle: 'riya', name: 'Riya' },
    ...change,
  };
}
