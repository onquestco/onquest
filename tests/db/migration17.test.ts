import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { asServiceRole, blogFunctions } from './blogHelpers';
import { GOA, GOKARNA } from './socialHelpers';
import { ALEX, createTestDatabase, NEWCOMER, STRANGER } from './testDatabase';

// Migration 17 must keep the previous release working (blogs spec §8): on the same data, every
// public and bell function the app already calls returns exactly what it returned before the
// migration, plus the new `blogs` keys only. list_feed doesn't change at all.

const MIGRATION_17 = '20261124110000_17_blog_social.sql';
const migrationsBefore17 = readdirSync(join(process.cwd(), 'supabase', 'migrations'))
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .indexOf(MIGRATION_17);

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
/** Set once the data exists: list_feed only lists Quests published before p_now. */
let NOW = '';
let blogKey = '';

const one = async (user: string | undefined, sql: string, params: unknown[] = []) =>
  (await test.queryAs<{ result: unknown }>(user, sql, params))[0]?.result;

/** Everything the current app reads, as JSON text so "unchanged" means exactly that. */
async function outputs() {
  return {
    profile: (await one(undefined, `select public.get_profile('alex') as result`)) as Record<string, unknown>,
    search: (await one(undefined, `select public.search_public('goa', 10) as result`)) as Record<string, unknown>,
    notifications: JSON.stringify(await one(ALEX, 'select public.list_my_notifications() as result')),
    feed: JSON.stringify(await one(STRANGER, 'select public.list_feed($1, 10, 0) as result', [NOW])),
    social: JSON.stringify(await one(undefined, 'select public.get_trip_social($1) as result', [GOA])),
    sitemap: JSON.stringify(await test.queryAs(undefined, 'select handle from public.list_sitemap_profiles()')),
  };
}

const without = (value: Record<string, unknown>, key: string) =>
  JSON.stringify(Object.fromEntries(Object.entries(value).filter(([name]) => name !== key)));

let before: Awaited<ReturnType<typeof outputs>>;
let after: Awaited<ReturnType<typeof outputs>>;

beforeAll(async () => {
  expect(migrationsBefore17).toBeGreaterThan(0);
  test = await createTestDatabase({ upTo: migrationsBefore17 });
  await test.addUser(STRANGER);
  await test.addUser(NEWCOMER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
  await test.queryAs(NEWCOMER, `select public.save_profile(null, '{"handle": "riya", "name": "Riya"}')`);
  await test.queryAs(STRANGER, 'select public.set_follow($1, true)', [ALEX]);
  await test.queryAs(STRANGER, 'select public.set_like($1, true)', [GOA]);
  await test.queryAs(NEWCOMER, 'select public.set_like($1, true)', [GOA]);
  await test.queryAs(NEWCOMER, 'select public.post_comment($1, $2)', [GOKARNA, 'Lovely coast']);
  // A blog posted before migration 17 (migration 16 is live first).
  await asServiceRole(test, 'select public.grant_feature_access($1, $2)', ['blogs', 'alex']);
  blogKey = (await blogFunctions(test).posted(ALEX, { slug: 'goa-on-15k' })).key;
  NOW = new Date().toISOString();

  before = await outputs();
  await test.migrateRest();
  after = await outputs();
}, 60_000);

describe('after migration 17', () => {
  it('get_profile returns every field as before, plus blogs', () => {
    expect(without(after.profile, 'blogs')).toBe(JSON.stringify(before.profile));
    expect(after.profile.blogs).toHaveLength(1);
  });

  it('search_public returns quests and people as before, plus blogs', () => {
    expect(without(after.search, 'blogs')).toBe(JSON.stringify(before.search));
    expect(after.search.blogs).toHaveLength(1);
  });

  it('the bell, list_feed, Quest social and the profile sitemap are unchanged', () => {
    expect(after.notifications).toBe(before.notifications);
    expect(after.feed).toBe(before.feed);
    expect(JSON.parse(after.feed)).toHaveLength(1);
    expect(after.social).toBe(before.social);
    expect(after.sitemap).toBe(before.sitemap);
  });

  it('list_feed still lists Quests only, with no type field, when followed people have blogs', async () => {
    await test.queryAs(STRANGER, 'select public.set_blog_like($1, true)', [blogKey]);
    const feed = (await one(STRANGER, 'select public.list_feed($1, 10, 0) as result', [NOW])) as {
      key: string;
    }[];
    expect(feed.map((item) => item.key)).toEqual([GOA]);
    expect(feed[0]).not.toHaveProperty('type');
  });
});
