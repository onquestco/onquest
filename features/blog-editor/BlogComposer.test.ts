import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BlogComposer } from './BlogComposer';
import { createBlogDraftStore, type InitialBlogDraft } from './blogDraftStore';
import { BlogPreview, countWords, HIDDEN_QUEST_NOTE, readersSeeLinkedQuest } from './BlogPreview';
import type { QuestCard } from '@/lib/trip/cards';
import type { Visibility } from '@/lib/trip/schema';

// vi.mock is hoisted above the imports. Rendered outside Next.js and without a server, so the
// router, links and server actions are stand-ins.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: () => undefined, push: () => undefined, replace: () => undefined }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href, className }, children),
}));
vi.mock('./actions', () => ({ saveBlogDraft: vi.fn(), discardBlogDraft: vi.fn(), searchBlogPlaces: vi.fn() }));
vi.mock('@/features/blogs/actions', () => ({ publishBlog: vi.fn() }));

const KEY = '11111111-1111-4111-8111-111111111111';
const PHOTO = '22222222-2222-4222-8222-222222222222';
const writer = { handle: 'riya', name: 'Riya' };

const initial = (change: Partial<InitialBlogDraft> = {}): InitialBlogDraft => ({
  key: KEY,
  ownerKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  photoFolder: `user/${KEY}`,
  draftSavedAt: '2026-11-24 10:00:00+00',
  blogSavedAt: '2026-11-24 10:00:00+00',
  status: 'draft',
  visibility: 'public',
  document: { title: 'Goa on 15k', body: 'We stayed in Anjuna.\n\nScooters were ₹400.', photos: [] },
  ...change,
});

describe('BlogComposer', () => {
  it('renders the draft straight from the server, top to bottom as in PRD B2', () => {
    const html = renderToStaticMarkup(createElement(BlogComposer, { initial: initial(), quests: [], writer }));
    for (const text of ['Close', 'Saved', 'Preview', 'Post', 'Goa on 15k', '0 of 10', 'Add photos', 'Add a place', 'Link a Quest']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('placeholder="Tell the story, share tips, what you&#x27;d do again…"');
    expect(html).toContain('We stayed in Anjuna.');
    // The title and text keep a visible label, a readable placeholder and a focus outline.
    expect(html).toMatch(/<label class="text-caption text-ink-muted" for="[^"]+">Title<\/label>/);
    expect(html).toMatch(/<label class="text-caption text-ink-muted" for="[^"]+">Text<\/label>/);
    expect(html).toContain('placeholder:text-ink-muted');
    expect(html).toContain('focus:outline-brand-strong');
    expect(html).not.toContain('placeholder:text-ink-subtle');
    const order = ['Goa on 15k', 'Add photos', 'We stayed in Anjuna.', 'Add a place', 'Link a Quest'].map((text) =>
      html.indexOf(text),
    );
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it('a new blog starts empty, with nothing saved yet and the Title placeholder', () => {
    const html = renderToStaticMarkup(
      createElement(BlogComposer, {
        initial: initial({ draftSavedAt: null, blogSavedAt: null, document: { body: '', photos: [] } }),
        quests: [],
        writer,
      }),
    );
    expect(html).toContain('placeholder="Title"');
    expect(html).not.toContain('>Saved<');
  });

  it('Preview shows the unsaved text, and Back to edit keeps it', () => {
    const store = createBlogDraftStore(initial());
    store.getState().change({ body: 'Typed just now, not saved yet.' });
    const before = store.getState();
    store.getState().setMode('preview');

    const html = renderToStaticMarkup(
      createElement(BlogPreview, {
        document: store.getState().document,
        photoFolder: store.getState().photoFolder,
        previews: store.getState().previews,
        writer,
        blogVisibility: 'public',
      }),
    );
    expect(html).toContain('Typed just now, not saved yet.');
    expect(html).toContain('<h1');
    expect(html).toContain('@riya · 1 min read');

    store.getState().setMode('edit');
    expect(store.getState().document).toBe(before.document);
    expect(store.getState().version).toBe(before.version);
  });

  it('Preview uses this device\'s photo previews before uploads are stored', () => {
    const store = createBlogDraftStore(initial());
    store.setState({ previews: { [PHOTO]: 'blob:local-preview' } });
    store.getState().change({ photos: [{ id: PHOTO, width: 1200, height: 900 }] });
    const html = renderToStaticMarkup(
      createElement(BlogPreview, {
        document: store.getState().document,
        photoFolder: store.getState().photoFolder,
        previews: store.getState().previews,
        writer,
        blogVisibility: 'public',
      }),
    );
    expect(html).toContain('src="blob:local-preview"');
  });

  it('counts words as publish_blog does', () => {
    expect(countWords('Goa on 15k', 'We stayed\n\nin Anjuna. ')).toBe(7);
    expect(countWords('', '')).toBe(0);
  });

  it('the first content or photo starts the clock for minutes_since_start', () => {
    const store = createBlogDraftStore(initial({ document: { body: '', photos: [] } }), () => new Date('2026-11-24T10:00:00Z'));
    expect(store.getState().document.startedAt).toBeUndefined();
    store.getState().change({ title: 'G' });
    expect(store.getState().document.startedAt).toBe('2026-11-24T10:00:00.000Z');
  });

  describe('the linked Quest in Preview (spec D12)', () => {
    const quest = (visibility: Visibility): QuestCard => ({
      key: '33333333-3333-4333-8333-333333333333',
      title: '3 days in Goa',
      status: 'published',
      visibility,
      path: '/@riya/goa',
      coverThumb: 'https://photos.example/goa/thumb.webp',
      pageCount: 5,
      photoCount: 15,
      places: ['Goa'],
      likeCount: 0,
      commentCount: 0,
      savedAt: '2026-11-20 10:00:00+00',
      owner: { key: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', handle: 'riya', name: 'Riya' },
    });
    const preview = (questVisibility: Visibility, blogVisibility: Visibility) =>
      renderToStaticMarkup(
        createElement(BlogPreview, {
          document: initial().document,
          photoFolder: `user/${KEY}`,
          previews: {},
          writer,
          linkedQuest: quest(questVisibility),
          blogVisibility,
        }),
      );

    it('readers see a public Quest, an unlisted one only on a blog that isn\'t public, a private one never', () => {
      expect(readersSeeLinkedQuest('public', 'public')).toBe(true);
      expect(readersSeeLinkedQuest('unlisted', 'public')).toBe(false);
      expect(readersSeeLinkedQuest('unlisted', 'unlisted')).toBe(true);
      expect(readersSeeLinkedQuest('private', 'unlisted')).toBe(false);
    });

    it('shows the card for a Quest readers will see, without a link that would leave the composer', () => {
      const html = preview('public', 'public');
      expect(html).toContain('From this trip');
      expect(html).toContain('5 pages · 15 photos');
      expect(html).not.toContain('href="/@riya/goa"');
    });

    it("shows only the writer's note when readers won't see the card", () => {
      for (const [questVisibility, blogVisibility] of [
        ['unlisted', 'public'],
        ['private', 'public'],
        ['private', 'unlisted'],
      ] as const) {
        const html = preview(questVisibility, blogVisibility);
        expect(html).not.toContain('From this trip');
        expect(html).toContain(HIDDEN_QUEST_NOTE.replace("'", '&#x27;'));
      }
    });
  });
});
