import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// Feed, suggestions, trending, chips and travellers (spec C §3.4), including M21's ranking.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
const NOW = '2026-11-10T12:00:00Z';
const hoursAgo = (hours: number) => new Date(Date.parse(NOW) - hours * 3600_000).toISOString();
let next = 0;

/** A published Quest straight into the table, as publish_trip would leave it. */
async function quest(owner: string, publishedAt: string, visibility = 'public', town = 'Manali') {
  const key = `00000000-0000-4000-8000-0000000c${String(++next).padStart(4, '0')}`;
  await db.db.query(
    `insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, seed, content,
       word_count, published_at, photos, places, comments_on, search_text, saved_at, saved_by, save_reason)
     values ($1, $2, $3, 'beach', $4, 'published', $3, 1, '{"favourites": [], "days": []}', 10, $5, '[]',
       jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', $6::text, 'lat', 1, 'lng', 1,
         'city', $6::text)),
       true, lower($3 || ' ' || $6), now(), $2, 'publish')`,
    [key, owner, `quest-${next}`, visibility, publishedAt, town],
  );
  return key;
}
const likeAs = (users: string[], trip: string) => Promise.all(users.map((user) => db.like(user, trip)));
const keys = (cards: { key: string }[]) => cards.map((card) => card.key);
const feed = (user: string, offset = 0, limit = 10) =>
  db.one<{ key: string; liked_by_me: boolean }[]>(user, 'select public.list_feed($1, $2, $3) as result', [
    NOW,
    limit,
    offset,
  ]);

let samOld: string;
let samNew: string;
let samUnlisted: string;
beforeAll(async () => {
  db = await createSocialDatabase();
  samOld = await quest(STRANGER, hoursAgo(10));
  samNew = await quest(STRANGER, hoursAgo(0.5));
  samUnlisted = await quest(STRANGER, hoursAgo(1), 'unlisted');
  await quest(NEWCOMER, hoursAgo(1)); // Riya: not followed
  await likeAs([ALEX], samOld);
  await db.queryAs(ALEX, 'select public.set_follow($1, true)', [STRANGER]);
}, 30_000);

describe('quest_score', () => {
  it('ranks a same-hour Quest with more likes and comments higher', async () => {
    const score = (likes: number, comments: number, hours: number) =>
      db.count('select public.quest_score($1, $2, $3, $4) * 1e9 as n', [
        likes,
        comments,
        hoursAgo(hours),
        NOW,
      ]);
    expect((await score(5, 2, 1)) > (await score(1, 0, 1))).toBe(true);
    // 10 hours older needs about 3× the points of a brand-new Quest: 3.75× stays above, 1× doesn't.
    expect((await score(6, 1, 10)) > (await score(1, 0, 0))).toBe(true);
    expect((await score(1, 0, 10)) < (await score(1, 0, 0))).toBe(true);
  });
});

describe('list_feed', () => {
  it('shows only public Quests from people I follow, newer first when likes are close', async () => {
    expect(keys(await feed(ALEX))).toEqual([samNew, samOld]);
  });

  it('tells me which I liked', async () => {
    const items = await feed(ALEX);
    expect(items.find((item) => item.key === samOld)?.liked_by_me).toBe(true);
  });

  it('pages without repeating', async () => {
    const first = await feed(ALEX, 0, 1);
    const second = await feed(ALEX, 1, 1);
    expect([...keys(first), ...keys(second)]).toEqual([samNew, samOld]);
  });

  it('suggests Quests from people I do not follow, never mine', async () => {
    const suggested = await db.one<{ owner: { key: string } }[]>(
      ALEX,
      'select public.list_suggested_quests(6) as result',
    );
    expect(new Set(suggested.map((card) => card.owner.key))).toEqual(new Set([NEWCOMER]));
  });

  it('suggests travellers I do not follow yet', async () => {
    const people = await db.one<{ key: string }[]>(
      ALEX,
      'select public.list_travellers_to_follow(6) as result',
    );
    expect(keys(people)).toEqual([NEWCOMER]);
  });

  it('lists trending public Quests and common towns to anyone', async () => {
    const trending = await db.one<{ key: string }[]>(
      undefined,
      'select public.list_trending_quests(12) as result',
    );
    expect(keys(trending)).toContain(samOld);
    expect(keys(trending)).not.toContain(samUnlisted);
    const chips = await db.one<string[]>(undefined, 'select public.list_place_chips(8) as result');
    expect(chips[0]).toBe('Manali');
  });

  it('needs sign-in for the feed', async () => {
    await expect(db.queryAs(undefined, 'select public.list_feed(now(), 10, 0)')).rejects.toThrow(
      /permission denied/,
    );
  });
});
