import { describe, expect, it } from 'vitest';
import { toBlogCards, toFeedItems, toHomeFeedItems, toPeople, toQuestCards } from './cardRows';
import { FeedPageSchema, SearchResultsSchema } from './schema';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';

const owner = {
  key: '00000000-0000-4000-8000-000000000001',
  handle: 'riya',
  name: 'Riya',
  avatar_url: null,
  home_city: 'Pune',
};
const row = {
  key: '00000000-0000-4000-8000-0000000000a1',
  title: null,
  status: 'published',
  visibility: 'public',
  path: '/@riya/goa',
  cover_photo_key: '00000000-0000-4000-8000-0000000000b1',
  photo_folder: 'u/t',
  page_count: 3,
  photo_count: 7,
  places: ['Panjim', 'Palolem', 'Agonda', 'Extra'],
  like_count: 4,
  comment_count: 1,
  published_at: '2026-11-01T10:00:00+00:00',
  saved_at: '2026-11-01 10:00:00.123+00',
  owner,
};

describe('toQuestCards', () => {
  it('names untitled Quests, builds the cover URL and keeps three places', () => {
    const [card] = toQuestCards([row]);
    expect(card).toMatchObject({ title: 'Untitled Quest', pageCount: 3, likeCount: 4, path: '/@riya/goa' });
    // Whatever the Supabase URL is (CI sets its own).
    const coverPath = '/storage/v1/object/public/photos/u/t/00000000-0000-4000-8000-0000000000b1/thumb.webp';
    expect(card?.coverThumb?.endsWith(coverPath)).toBe(true);
    expect(card?.places).toEqual(['Panjim', 'Palolem', 'Agonda']);
  });

  it('marks feed items the viewer liked', () => {
    expect(toFeedItems([{ ...row, liked_by_me: true }])[0]?.likedByMe).toBe(true);
    expect(toFeedItems([row])[0]?.likedByMe).toBe(false);
  });
});

describe('toPeople', () => {
  it('drops empty fields', () => {
    expect(toPeople([owner])).toEqual([
      { key: owner.key, handle: 'riya', name: 'Riya', avatarUrl: undefined, homeCity: 'Pune' },
    ]);
  });
});

const blogRow = {
  key: '00000000-0000-4000-8000-0000000000c1',
  title: 'Goa on 15k',
  status: 'published',
  visibility: 'public',
  path: '/@riya/blog/goa-on-15k',
  excerpt: 'Three days, one scooter.',
  cover_photo_key: '00000000-0000-4000-8000-0000000000b2',
  photo_folder: 'u/b',
  photo_count: 2,
  word_count: 820,
  place_name: 'Goa',
  like_count: 3,
  comment_count: 1,
  published_at: '2026-11-20T10:00:00+00:00',
  saved_at: '2026-11-20 10:00:00.123+00',
  owner,
};

describe('toBlogCards (blog_card_json, migration 17)', () => {
  it('builds read time, cover and place', () => {
    const [card] = toBlogCards([blogRow]);
    expect(card).toMatchObject({ title: 'Goa on 15k', readMinutes: 4, placeName: 'Goa', likeCount: 3, photoCount: 2 });
    expect(card?.coverThumb?.endsWith('/photos/u/b/00000000-0000-4000-8000-0000000000b2/thumb.webp')).toBe(true);
    expect(card?.owner).toEqual({ key: owner.key, handle: 'riya', name: 'Riya', avatarUrl: undefined });
  });

  it('shows the excerpt as plain text: no markers, spoilers hidden, a cut-off spoiler too', () => {
    const excerpt = (text: string) => toBlogCards([{ ...blogRow, excerpt: text }])[0]?.excerpt;
    expect(excerpt('Three days, one scooter.')).toBe('Three days, one scooter.');
    expect(excerpt('# Day 1 **Beach** and ~~fort~~ `market`')).toBe('Day 1 Beach and fort market');
    expect(excerpt('The ending: >!he was the guide!< wow')).toBe('The ending: (spoiler) wow');
    // The database cut the excerpt at 150 characters, inside the spoiler.
    expect(excerpt('The ending: >!he was the gu')).toBe('The ending: (spoiler)');
  });

  it('names an untitled draft, and a text-only blog has no cover', () => {
    const [draft] = toBlogCards([
      {
        ...blogRow,
        title: null,
        status: 'draft',
        path: null,
        cover_photo_key: null,
        word_count: 0,
        place_name: null,
        published_at: null,
        comments_on: true,
        draft_saved_at: '2026-11-24 10:00:00.1+00',
      },
    ]);
    expect(draft).toMatchObject({ title: 'Untitled blog', readMinutes: 1, commentsOn: true });
    expect(draft?.path).toBeUndefined();
    expect(draft?.coverThumb).toBeUndefined();
    expect(draft?.placeName).toBeUndefined();
  });
});

describe('toHomeFeedItems (list_home_feed)', () => {
  it('keeps the order and marks each item with its type and like', () => {
    const items = toHomeFeedItems([
      { ...blogRow, type: 'blog', liked_by_me: true },
      { ...row, type: 'quest', liked_by_me: false },
    ]);
    expect(items.map((item) => item.type)).toEqual(['blog', 'quest']);
    expect(items[0]).toMatchObject({ key: blogRow.key, likedByMe: true, readMinutes: 4 });
    expect(items[1]).toMatchObject({ key: row.key, likedByMe: false, title: 'Untitled Quest' });
    // What /api/feed sends is what "Load more" parses.
    expect(FeedPageSchema.parse({ items, nextOffset: null, now: '2026-11-24T00:00:00Z' }).items).toHaveLength(2);
  });
});

describe('SearchResultsSchema', () => {
  it('reads a response from before blogs, with no blogs list', () => {
    expect(SearchResultsSchema.parse({ quests: [], people: [], guides: [] }).blogs).toEqual([]);
  });
});
