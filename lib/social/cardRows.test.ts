import { describe, expect, it } from 'vitest';
import { toFeedItems, toPeople, toQuestCards } from './cardRows';

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
