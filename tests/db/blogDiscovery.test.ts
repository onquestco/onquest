import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { blogDocument, blogFunctions } from './blogHelpers';
import { createSocialDatabase, GOA } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// Blogs everywhere else (blogs spec §3.5, §4.3 migration 17, PRD B12 and S1–S3): profiles, the
// Home feed, Explore, search, the sitemap and the writer's own list. Only public posted blogs
// are ever listed; unlisted, private and drafts never are.
// Riya (NEWCOMER) writes 2 public blogs, 1 unlisted, 1 private and 1 draft. Alex follows her.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
let blogs: ReturnType<typeof blogFunctions>;
let older: string;
let newer: string;
let unlisted: string;
let secret: string;
let draft: string;

type Card = { key: string; type?: string; liked_by_me?: boolean; title: string | null; path: string | null };
const keys = (cards: { key: string }[]) => cards.map((card) => card.key);
const homeFeed = (user: string | undefined, offset = 0, limit = 10) =>
  db.one<Card[]>(user, 'select public.list_home_feed(now(), $1, $2) as result', [limit, offset]);
const search = (text: string) =>
  db.one<{ quests: { key: string }[]; people: unknown[]; blogs: Card[] }>(
    undefined,
    'select public.search_public($1, 10) as result',
    [text],
  );

beforeAll(async () => {
  db = await createSocialDatabase();
  blogs = blogFunctions(db);
  await blogs.grant('riya');
  older = (
    await blogs.posted(NEWCOMER, {
      slug: 'monsoon-in-kerala',
      document: blogDocument({
        title: 'Monsoon in Kerala',
        body: 'Backwaters, rain and appam.\n\n\nA houseboat   in Alleppey.',
        place: { name: 'Alleppey', city: 'Alappuzha', countryCode: 'IN' },
      }),
    })
  ).key;
  newer = (
    await blogs.posted(NEWCOMER, {
      slug: 'goa-on-15k',
      document: blogDocument({ title: '100% Goa on 15k', photos: [] }),
    })
  ).key;
  unlisted = (
    await blogs.posted(NEWCOMER, {
      visibility: 'unlisted',
      slug: 'quiet-hampi-k3f9x2',
      document: blogDocument({ title: 'Quiet Hampi', body: 'Boulders everywhere.' }),
    })
  ).key;
  secret = (
    await blogs.posted(NEWCOMER, {
      visibility: 'private',
      slug: 'just-me',
      document: blogDocument({ title: 'Secret Kerala', body: 'Backwaters only for me.' }),
    })
  ).key;
  draft = randomUUID();
  await blogs.create(NEWCOMER, draft, blogDocument({ title: undefined, body: 'Kerala draft, not posted' }));
  await db.queryAs(ALEX, 'select public.set_follow($1, true)', [NEWCOMER]);
  await blogs.like(ALEX, newer);
}, 30_000);

describe('get_profile.blogs (B12)', () => {
  it('lists the public posted blogs only, newest first, as cards', async () => {
    const profile = await db.one<{ blogs: (Card & Record<string, unknown>)[] }>(
      undefined,
      `select public.get_profile('riya') as result`,
    );
    expect(keys(profile.blogs)).toEqual([newer, older]);
    expect(profile.blogs[1]).toMatchObject({
      title: 'Monsoon in Kerala',
      status: 'published',
      visibility: 'public',
      path: '/@riya/blog/monsoon-in-kerala',
      excerpt: 'Backwaters, rain and appam. A houseboat in Alleppey.',
      place_name: 'Alleppey',
      photo_count: 2,
      like_count: 0,
      comment_count: 0,
      owner: { key: NEWCOMER, handle: 'riya', name: 'Riya' },
    });
    expect(profile.blogs[1]).toHaveProperty('cover_photo_key');
    expect(profile.blogs[0]).toMatchObject({ like_count: 1, photo_count: 0 });
    expect(profile.blogs[0]).not.toHaveProperty('search_text');
    expect(profile.blogs[0]).not.toHaveProperty('linked_trip_key');
  });

  it('keeps every field get_profile returned before, and gives people without blogs an empty list', async () => {
    const alex = await db.one<Record<string, unknown>>(undefined, `select public.get_profile('alex') as result`);
    expect(Object.keys(alex).sort()).toEqual(['blogs', 'pins', 'places', 'profile', 'stats', 'trips']);
    expect(alex.blogs).toEqual([]);
    expect(Object.keys(alex.stats as object).sort()).toEqual(
      ['countries', 'days', 'followers', 'following', 'places', 'trips'].sort(),
    );
    expect((alex.trips as Record<string, unknown>[])[0]).toHaveProperty('published_at');
  });
});

describe('list_home_feed (S2)', () => {
  it('mixes Quests and public blogs from people I follow, with type and liked_by_me', async () => {
    await db.queryAs(STRANGER, 'select public.set_follow($1, true)', [ALEX]);
    const items = await homeFeed(STRANGER);
    expect(keys(items)).toEqual([GOA]); // Sam follows Alex, who has one public Quest and no blogs
    expect(items[0]).toMatchObject({ type: 'quest', liked_by_me: false });

    const mine = await homeFeed(ALEX);
    expect(new Set(keys(mine))).toEqual(new Set([older, newer]));
    expect(mine.every((item) => item.type === 'blog')).toBe(true);
    expect(mine.find((item) => item.key === newer)?.liked_by_me).toBe(true);
    expect(mine.find((item) => item.key === older)?.liked_by_me).toBe(false);
  });

  it('never lists unlisted, private or draft blogs, or people I do not follow', async () => {
    const all = keys(await homeFeed(ALEX));
    for (const hidden of [unlisted, secret, draft]) expect(all).not.toContain(hidden);
    expect(await homeFeed(NEWCOMER)).toEqual([]); // Riya follows nobody
  });

  it('pages without repeating, Quests and blogs in one order', async () => {
    await db.queryAs(ALEX, 'select public.set_follow($1, true)', [STRANGER]);
    await db.db.query(
      `insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, seed, content,
         word_count, published_at, photos, places, comments_on, search_text, saved_at, saved_by, save_reason)
       values (gen_random_uuid(), $1, 'sams-quest', 'beach', 'public', 'published', 'Sam''s Quest', 1,
         '{"favourites": [], "days": []}', 10, now() - interval '1 hour', '[]', '[]', true, 'sams quest', now(),
         $1, 'publish')`,
      [STRANGER],
    );
    const everything = await homeFeed(ALEX, 0, 10);
    expect(everything).toHaveLength(3);
    expect(new Set(everything.map((item) => item.type))).toEqual(new Set(['quest', 'blog']));
    const pages = [...(await homeFeed(ALEX, 0, 2)), ...(await homeFeed(ALEX, 2, 2))];
    expect(keys(pages)).toEqual(keys(everything));
  });

  it('needs sign-in', async () => {
    await expect(db.queryAs(undefined, 'select public.list_home_feed(now(), 10, 0)')).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('list_explore_blogs (S3)', () => {
  it('lists public posted blogs to anyone, never unlisted, private or drafts', async () => {
    const cards = await db.one<Card[]>(undefined, 'select public.list_explore_blogs(6) as result');
    expect(new Set(keys(cards))).toEqual(new Set([older, newer]));
  });

  it('puts the last 30 days first', async () => {
    await db.db.query(
      `insert into public.blogs (key, owner_key, slug, status, visibility, title, body, photos, place,
         linked_trip_key, comments_on, search_text, word_count, published_at, published_draft_saved_at,
         started_at, saved_at, saved_by, save_reason)
       select gen_random_uuid(), $1, 'old-favourite', 'published', 'public', 'Old favourite', 'Very old.',
         '[]', null, null, true, 'old favourite very old.', 3, now() - interval '60 days', null, null, now(), $1,
         'publish'`,
      [NEWCOMER],
    );
    // Lots of likes would rank it first by score alone.
    const old = (await db.db.query<{ key: string }>(`select key from public.blogs where slug = 'old-favourite'`))
      .rows[0]!.key;
    await blogs.like(ALEX, old);
    await blogs.like(STRANGER, old);
    const cards = await db.one<Card[]>(undefined, 'select public.list_explore_blogs(6) as result');
    expect(keys(cards).at(-1)).toBe(old);
  });
});

describe('search_public.blogs (S1, S3)', () => {
  it('finds public blogs by title, a word in the body and the place name', async () => {
    expect(keys((await search('monsoon')).blogs)).toEqual([older]);
    expect(keys((await search('houseboat')).blogs)).toEqual([older]);
    expect(keys((await search('alleppey')).blogs)).toEqual([older]);
    expect(keys((await search('alappuzha')).blogs)).toEqual([older]); // the place's city
  });

  it('never finds unlisted, private or draft blogs', async () => {
    expect((await search('hampi')).blogs).toEqual([]);
    expect(keys((await search('kerala')).blogs)).toEqual([older]); // not the private or the draft
  });

  it('treats % and _ as letters', async () => {
    expect(keys((await search('100%')).blogs)).toEqual([newer]);
    expect((await search('%%')).blogs).toEqual([]);
  });

  it('keeps quests and people as before', async () => {
    const results = await search('palolem');
    expect(Object.keys(results).sort()).toEqual(['blogs', 'people', 'quests']);
    expect(keys(results.quests)).toEqual([GOA]);
  });
});

describe('list_sitemap_profiles', () => {
  it('includes a profile with public blogs and no public Quest', async () => {
    const rows = await db.queryAs<{ handle: string }>(undefined, 'select handle from public.list_sitemap_profiles()');
    expect(rows.map((row) => row.handle)).toContain('riya');
    expect(rows.map((row) => row.handle)).toContain('alex');
  });
});

describe('list_my_blogs', () => {
  it('lists my own blogs, drafts included, newest draft save first, from the draft', async () => {
    const tokens = await blogs.tokens(NEWCOMER, older);
    await blogs.saveDraft(NEWCOMER, older, tokens.draft, blogDocument({ title: 'Monsoon, edited', photos: [] }));
    const cards = await db.one<(Card & Record<string, unknown>)[]>(NEWCOMER, 'select public.list_my_blogs() as result');
    expect(new Set(keys(cards))).toEqual(new Set([older, newer, unlisted, secret, draft]));
    expect(cards[0]).toMatchObject({
      key: older,
      title: 'Monsoon, edited', // the draft's
      status: 'published',
      path: '/@riya/blog/monsoon-in-kerala', // the live row's
      photo_count: 0,
      comments_on: true,
    });
    expect(cards[0]).toHaveProperty('draft_saved_at');
    expect(cards.find((card) => card.key === draft)).toMatchObject({ status: 'draft', title: null, path: null });
    expect(cards.find((card) => card.key === secret)).toMatchObject({ visibility: 'private' });
  });

  it('is only ever the signed-in person’s own', async () => {
    expect(await db.one(STRANGER, 'select public.list_my_blogs() as result')).toEqual([]);
    await expect(db.queryAs(undefined, 'select public.list_my_blogs()')).rejects.toThrow(/permission denied/);
  });
});

describe('list_my_comment_blog_keys', () => {
  it('lists the blogs I commented on', async () => {
    await blogs.comment(STRANGER, newer, 'Nice');
    expect(await db.one(STRANGER, 'select public.list_my_comment_blog_keys() as result')).toEqual([newer]);
    expect(await db.one(ALEX, 'select public.list_my_comment_blog_keys() as result')).toEqual([]);
  });
});
