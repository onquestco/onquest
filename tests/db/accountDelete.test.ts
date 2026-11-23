import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { asServiceRole as asBlogServiceRole, blogFunctions } from './blogHelpers';
import { createSocialDatabase, GOA } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// Account deletion (spec C §3.9): everything of the person goes, live and archived; other people's
// data stays; tombstones and handle claims are kept so links say "removed" and nobody reuses a
// username.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
type Result = {
  liked_or_commented_trip_keys: string[];
  follow_profile_keys: string[];
  own_trips: { key: string; slug: string }[];
  own_blogs: { key: string; slug: string }[];
  handles: string[];
};
let result: Result;

async function asServiceRole<T>(sql: string, params: unknown[] = []) {
  await db.db.exec('set role service_role');
  try {
    return (await db.db.query<T>(sql, params)).rows;
  } finally {
    await db.db.exec('reset role');
  }
}

beforeAll(async () => {
  db = await createSocialDatabase();
  // Sam reacts to Alex's Quest and follows Alex; Riya follows Sam; Alex likes nothing.
  await db.like(STRANGER, GOA);
  await db.comment(STRANGER, GOA, 'So good');
  await db.like(NEWCOMER, GOA);
  await db.queryAs(STRANGER, 'select public.set_follow($1, true)', [ALEX]);
  await db.queryAs(NEWCOMER, 'select public.set_follow($1, true)', [STRANGER]);
  await db.like(STRANGER, GOA, false); // an archived like too
  await db.like(STRANGER, GOA);

  await asServiceRole('select public.mark_account_deleted($1)', [STRANGER]);
  const rows = await asServiceRole<{ result: Result }>('select public.delete_account_data($1) as result', [
    STRANGER,
  ]);
  result = rows[0]!.result;
}, 30_000);

const rowsOf = (sql: string) => db.count(sql, [STRANGER]);

describe('delete_account_data', () => {
  it('removes every row of the person, live and archived', async () => {
    expect(await rowsOf('select count(*) n from public.profiles where key = $1')).toBe(0);
    expect(await rowsOf('select count(*) n from public.profiles_archive where key = $1')).toBe(0);
    expect(await rowsOf('select count(*) n from public.likes where user_key = $1')).toBe(0);
    expect(await rowsOf('select count(*) n from public.likes_archive where user_key = $1')).toBe(0);
    expect(await rowsOf('select count(*) n from public.comments where author_key = $1')).toBe(0);
    expect(
      await rowsOf('select count(*) n from public.follows where $1 in (follower_key, followee_key)'),
    ).toBe(0);
    expect(
      await rowsOf('select count(*) n from public.notifications where actor_key = $1 or recipient_key = $1'),
    ).toBe(0);
  });

  it("leaves other people's data alone", async () => {
    expect(await db.count('select count(*) n from public.likes where user_key = $1', [NEWCOMER])).toBe(1);
    expect(await db.count('select count(*) n from public.profiles where key = $1', [ALEX])).toBe(1);
  });

  it('keeps their username claimed forever', async () => {
    expect(await rowsOf('select count(*) n from public.handle_claims where profile_key = $1')).toBe(1);
    expect(await db.one(NEWCOMER, `select public.is_handle_available('sam') as result`)).toBe(false);
    expect(await db.one(undefined, `select public.resolve_handle('sam') as result`)).toBeNull();
  });

  it('returns what the server must refresh', () => {
    expect(result.liked_or_commented_trip_keys).toEqual([GOA]);
    expect([...result.follow_profile_keys].sort()).toEqual([ALEX, NEWCOMER].sort());
    expect(result.handles).toEqual(['sam']);
    expect(result.own_trips).toEqual([]);
    expect(result.own_blogs).toEqual([]);
  });

  it('lists the deletion as pending until the auth user is gone too', async () => {
    const pending = async () =>
      (await asServiceRole<{ result: string[] }>('select public.list_pending_deletions() as result'))[0]!
        .result;
    expect(await pending()).toEqual([STRANGER]);
    await db.db.query('delete from auth.users where id = $1', [STRANGER]);
    expect(await pending()).toEqual([]);
  });

  it("can't be called by signed-in users", async () => {
    await expect(db.queryAs(ALEX, 'select public.delete_account_data($1)', [ALEX])).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.queryAs(ALEX, 'select * from public.deleted_accounts')).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('deleting the owner of Quests', () => {
  it('tombstones their links and removes their Quests', async () => {
    const rows = await asServiceRole<{ result: Result }>('select public.delete_account_data($1) as result', [
      ALEX,
    ]);
    expect(rows[0]!.result.own_trips.map((trip) => trip.slug).sort()).toEqual([
      'goa-2026',
      'gokarna-k3f9x2',
      'secret-trip',
    ]);
    expect(await db.count('select count(*) n from public.trips where owner_key = $1', [ALEX])).toBe(0);
    expect(await db.count('select count(*) n from public.likes where trip_key = $1', [GOA])).toBe(0);
    expect(await db.one(undefined, `select public.get_trip_status('alex', 'goa-2026') as result`)).toBe(
      'removed',
    );
  });
});

describe('deleting a writer of blogs (blogs spec §5)', () => {
  let test: Awaited<ReturnType<typeof createSocialDatabase>>;
  let blogs: ReturnType<typeof blogFunctions>;
  let posted: { key: string; slug: string };
  let deleted: Result;

  beforeAll(async () => {
    test = await createSocialDatabase();
    blogs = blogFunctions(test);
    await blogs.grant('riya');
    posted = await blogs.posted(NEWCOMER, { slug: 'riya-in-goa' });
    // A second handle, an autosave archive and a draft that was never posted.
    await blogs.saveDraft(NEWCOMER, posted.key, (await blogs.tokens(NEWCOMER, posted.key)).draft, { body: 'edit' });
    await blogs.create(NEWCOMER, randomUUID());
    const profile = (await test.queryAs<{ t: string }>(NEWCOMER, 'select saved_at::text t from public.profiles'))[0]!;
    await test.queryAs(NEWCOMER, `select public.save_profile($1, '{"handle": "riya_two", "name": "Riya"}')`, [
      profile.t,
    ]);
    await asBlogServiceRole(test, 'select public.mark_account_deleted($1)', [NEWCOMER]);
    deleted = (
      await asBlogServiceRole<{ result: typeof deleted }>(test, 'select public.delete_account_data($1) as result', [
        NEWCOMER,
      ])
    )[0]!.result;
  }, 30_000);

  it('removes their blogs, drafts, archives and access', async () => {
    for (const table of ['blogs', 'blogs_archive', 'blog_drafts', 'blog_drafts_archive']) {
      expect(await test.count(`select count(*) n from public.${table} where owner_key = $1`, [NEWCOMER])).toBe(0);
    }
    expect(await test.count('select count(*) n from public.feature_access where user_key = $1', [NEWCOMER])).toBe(0);
  });

  it('keeps tombstones under every handle they had, and says what to refresh', async () => {
    expect(await test.one(undefined, `select public.get_blog_status('riya', 'riya-in-goa') as result`)).toBe(
      'removed',
    );
    expect(await test.one(undefined, `select public.get_blog_status('riya_two', 'riya-in-goa') as result`)).toBe(
      'removed',
    );
    expect(deleted.own_blogs).toEqual([posted]);
    expect(deleted.handles).toEqual(['riya', 'riya_two']);
  });

  it('keeps a half-finished deletion of someone with only blogs left on the daily job', async () => {
    const pending = async () =>
      (await asBlogServiceRole<{ result: string[] }>(test, 'select public.list_pending_deletions() as result'))[0]!
        .result;
    const left = randomUUID();
    await test.db.query('delete from auth.users where id = $1', [NEWCOMER]);
    expect(await pending()).toEqual([]);
    // Rows a crashed run could leave: a blog and its draft, with the profile already gone.
    await test.db.exec(`
      set session_replication_role = replica;
      insert into public.blogs (key, owner_key, slug, status, visibility, title, body, photos, place,
        linked_trip_key, comments_on, search_text, word_count, published_at, published_draft_saved_at,
        started_at, saved_at, saved_by, save_reason)
      values ('${left}', '${NEWCOMER}', null, 'draft', 'public', null, '', '[]', null, null, true, '', 0,
        null, null, null, now(), null, 'create');
      set session_replication_role = origin;`);
    expect(await pending()).toEqual([NEWCOMER]);
  });
});
