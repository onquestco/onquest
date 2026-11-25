import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { blogCardFixture as blog } from '@/features/blogs/blogCardFixture';
import { YourQuestsView } from './YourQuestsView';

// vi.mock is hoisted above the imports. Rendered outside Next.js and without a server.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: () => undefined, push: () => undefined, replace: () => undefined, refresh: () => undefined }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('@/features/editor/publishActions', () => ({
  deleteQuest: vi.fn(),
  setQuestComments: vi.fn(),
  setQuestVisibility: vi.fn(),
}));
vi.mock('@/features/blogs/actions', () => ({ deleteBlog: vi.fn(), setBlogComments: vi.fn(), setBlogVisibility: vi.fn() }));
vi.mock('@/features/blog-editor/actions', () => ({ deleteBlogDraft: vi.fn() }));

const render = (props: Partial<Parameters<typeof YourQuestsView>[0]> = {}) =>
  renderToStaticMarkup(createElement(YourQuestsView, { initial: [], ...props }));

describe('YourQuestsView Quests · Blogs (blogs spec §6.3, PRD B5)', () => {
  it('without access or blogs: no switch, the tab as before', () => {
    const html = render();
    expect(html).not.toContain('Quests or blogs');
    expect(html).toContain(
      '<main class="mx-auto flex max-w-lg md:max-w-3xl flex-col gap-6 px-4 py-4"><a href="/quests/new?source=quests_tab"',
    );
  });

  it('with blogs: the switch, drafts with "Continue editing" opening the composer, ⋯ on every row', () => {
    const draft = blog(1, { status: 'draft', path: undefined, title: 'Untitled blog' });
    const html = render({ blogs: [draft, blog(2, { visibility: 'private' })] });
    expect(html).toContain('aria-label="Quests or blogs"');
    expect(html).toContain(`href="/blogs/${draft.key}/edit"`);
    expect(html).toContain('Continue editing');
    expect(html).toContain('>Draft</span>');
    expect(html).toContain('>Private</span>');
    expect(html).toContain('aria-label="Manage Goa on 15k, part 2"');
    // A draft's ⋯ offers Continue editing and Delete draft (blogs-editor spec §6.3).
    expect(html).toContain('aria-label="Manage Untitled blog"');
  });

  it('with access and no blogs: the switch and "No blogs yet. Write about a trip."', () => {
    const html = render({ canWriteBlogs: true });
    expect(html).toContain('No blogs yet. Write about a trip.');
    expect(html).toContain('href="/blogs/new?source=create"');
  });
});
