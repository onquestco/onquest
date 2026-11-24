import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ProfileView as Profile } from './getProfile';
import { ProfileView } from './ProfileView';

// vi.mock is hoisted above the imports. Rendered outside Next.js and without a server, so the
// router, links and server actions are stand-ins.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: () => undefined, push: () => undefined, replace: () => undefined, refresh: () => undefined }),
  usePathname: () => '/@riya',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('@/features/quests/actions', () => ({ loadQuestToManage: vi.fn() }));
vi.mock('@/features/editor/publishActions', () => ({
  deleteQuest: vi.fn(),
  setQuestComments: vi.fn(),
  setQuestVisibility: vi.fn(),
}));
vi.mock('./actions', () => ({ setFollow: vi.fn() }));

const OWNER = '00000000-0000-4000-8000-000000000001';
const owner = { key: OWNER, handle: 'riya', name: 'Riya Shah' };

const profile: Profile = {
  key: OWNER,
  handle: 'riya',
  name: 'Riya Shah',
  bio: 'Beaches, buses and street food.',
  homeCity: 'Pune',
  avatarUrl: undefined,
  stats: { quests: 2, trips: 2, places: 5, countries: 1, days: 9, followers: 12, following: 3 },
  places: ['Goa', 'Gokarna'],
  pins: [],
  quests: [1, 2].map((n) => ({
    key: `00000000-0000-4000-8000-0000000000a${n}`,
    title: `Quest ${n}`,
    status: 'published' as const,
    visibility: 'public' as const,
    path: `/@riya/quest-${n}`,
    coverThumb: `https://photos.example/${n}/thumb.webp`,
    pageCount: 3,
    publishedAt: '2026-10-0' + n + 'T10:00:00Z',
    photoCount: 7,
    places: [],
    likeCount: 0,
    commentCount: 0,
    savedAt: '',
    owner,
  })),
  blogs: [],
};

describe('ProfileView before blogs (capture)', () => {
  it('prints the markup of a profile with no blogs', () => {
    const html = renderToStaticMarkup(createElement(ProfileView, { profile }));
    console.log(`GOLDEN>>>${JSON.stringify(html)}<<<GOLDEN`);
    expect(html).toContain('Riya Shah');
  });
});
