import { readFileSync } from 'node:fs';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { BlogCard } from '@/lib/blog/cards';
import type { ProfileView as Profile } from './getProfile';
import { profileBlogs } from './profileBlogs';
import { ProfileView } from './ProfileView';

// BL-05's "screenshot test" (issue #25): a profile without blogs must render exactly as before
// blogs. profileBeforeBlogs.html is the markup main rendered for this same profile before BL-05
// (captured from CI on 24 Nov 2026, commit 1 of PR #33). Unit tests have no browser, so the
// server-rendered HTML stands in for the picture: same markup and classes, same look.

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
vi.mock('@/features/blog-editor/actions', () => ({ deleteBlogDraft: vi.fn() }));
vi.mock('@/features/blogs/actions', () => ({
  deleteBlog: vi.fn(),
  setBlogComments: vi.fn(),
  setBlogVisibility: vi.fn(),
}));

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

const blog = (n: number, change: Partial<BlogCard> = {}): BlogCard => ({
  key: `00000000-0000-4000-8000-0000000000b${n}`,
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
  owner,
  ...change,
});

const render = (change: Partial<Profile> = {}) =>
  renderToStaticMarkup(createElement(ProfileView, { profile: { ...profile, ...change } }));

describe('ProfileView', () => {
  it('a profile without blogs renders exactly as before blogs (no switch)', () => {
    const before = readFileSync(new URL('./profileBeforeBlogs.html', import.meta.url), 'utf8');
    expect(render()).toBe(before);
  });

  it('with public blogs: the Quests · Blogs switch, Quests first, the blogs one column', () => {
    const html = render({ blogs: [blog(1), blog(2, { coverThumb: 'https://photos.example/b2/thumb.webp' })] });
    expect(html).toContain('aria-label="Quests or blogs"');
    expect(html).toContain('name="Quests or blogs" checked="" value="quests"');
    expect(html).toContain('>Blogs</label>');
    // The count row is unchanged: blogs aren't counted there.
    expect(html).not.toMatch(/<span class="text-caption text-ink-muted">Blogs?<\/span>/);
    // Blog 1 has no photo: a letter tile, never an empty image box.
    expect(html).toContain('href="/@riya/blog/goa-on-15k-1"');
    expect(html).toMatch(/aria-hidden="true" class="[^"]*bg-brand-wash[^"]*">G<\/span>/);
    expect(html).toContain('src="https://photos.example/b2/thumb.webp"');
    expect(html).toContain('4 min read · 2 likes');
    expect(html).toContain('We stayed in Anjuna and rented a scooter.');
    // Someone else's list: no tags, no ⋯.
    expect(html).not.toContain('Manage Goa on 15k');
  });
});

describe('profileBlogs', () => {
  const none = { publicBlogs: [], ownBlogs: null, isSelf: false, canWriteBlogs: false };

  it("someone else's profile without public blogs: no switch", () => {
    expect(profileBlogs(none).showSwitch).toBe(false);
  });

  it("someone else's profile with public blogs: the switch and those blogs", () => {
    const shown = profileBlogs({ ...none, publicBlogs: [blog(1), blog(2)] });
    expect(shown).toMatchObject({ showSwitch: true, own: false, showEmpty: false });
    expect(shown.blogs).toHaveLength(2);
  });

  it('your own profile without access or blogs looks as before', () => {
    expect(profileBlogs({ ...none, isSelf: true, ownBlogs: [] }).showSwitch).toBe(false);
  });

  it('your own profile with access and no blogs: the switch and the empty state', () => {
    expect(profileBlogs({ ...none, isSelf: true, ownBlogs: [], canWriteBlogs: true })).toMatchObject({
      showSwitch: true,
      showEmpty: true,
    });
  });

  it('your own profile lists drafts, unlisted and private blogs once they load', () => {
    const own = [blog(1, { status: 'draft' }), blog(2, { visibility: 'unlisted' }), blog(3, { visibility: 'private' })];
    const shown = profileBlogs({ ...none, isSelf: true, ownBlogs: own, publicBlogs: [] });
    expect(shown).toMatchObject({ showSwitch: true, own: true, showEmpty: false });
    expect(shown.blogs).toBe(own);
  });

  it('your own profile keeps the public list until yours arrives', () => {
    const shown = profileBlogs({ ...none, isSelf: true, canWriteBlogs: true, publicBlogs: [blog(1)] });
    expect(shown).toMatchObject({ showSwitch: true, own: false });
  });
});
