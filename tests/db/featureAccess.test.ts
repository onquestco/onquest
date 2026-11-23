import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { asServiceRole, blogFunctions } from './blogHelpers';
import { ALEX, createTestDatabase, NEWCOMER, STRANGER } from './testDatabase';

// The blogs flag (spec §3.9): founders first, then friends-test users, then everyone, with no
// deploy. Only the service role grants and revokes; create_blog checks it in the database.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
let blogs: ReturnType<typeof blogFunctions>;

beforeAll(async () => {
  test = await createTestDatabase();
  blogs = blogFunctions(test);
  await test.addUser(STRANGER);
  await test.addUser(NEWCOMER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
  await test.queryAs(NEWCOMER, `select public.save_profile(null, '{"handle": "riya", "name": "Riya"}')`);
}, 30_000);

const hasAccess = async (user: string) =>
  (await test.queryAs<{ r: boolean }>(user, `select public.has_feature_access('blogs') r`))[0]!.r;
const rows = async () => Number((await test.db.query<{ n: number }>('select count(*) n from public.feature_access')).rows[0]!.n);
const archived = async () =>
  Number((await test.db.query<{ n: number }>('select count(*) n from public.feature_access_archive')).rows[0]!.n);

describe('feature access', () => {
  it('starts empty: nobody can create a blog', async () => {
    expect(await hasAccess(ALEX)).toBe(false);
    await expect(blogs.create(ALEX, randomUUID())).rejects.toThrow(/no access/);
  });

  it('grants one person by handle, once however often it is run', async () => {
    await blogs.grant('ALEX');
    await blogs.grant('alex');
    expect(await rows()).toBe(1);
    expect(await hasAccess(ALEX)).toBe(true);
    expect(await hasAccess(STRANGER)).toBe(false);
    await blogs.create(ALEX, randomUUID());
    await expect(blogs.create(STRANGER, randomUUID())).rejects.toThrow(/no access/);
  });

  it('grants everyone with a null handle', async () => {
    await blogs.grant(null);
    await blogs.grant(null);
    expect(await rows()).toBe(2);
    expect(await hasAccess(STRANGER)).toBe(true);
    expect(await hasAccess(NEWCOMER)).toBe(true);
    await blogs.create(STRANGER, randomUUID());
  });

  it('revokes by archiving: everyone first, then one person', async () => {
    await blogs.revoke(null);
    expect(await hasAccess(STRANGER)).toBe(false);
    expect(await hasAccess(ALEX)).toBe(true);
    await blogs.revoke('alex');
    expect(await hasAccess(ALEX)).toBe(false);
    expect(await rows()).toBe(0);
    expect(await archived()).toBe(2);
    // Revoking again changes nothing.
    await blogs.revoke('alex');
    expect(await archived()).toBe(2);
  });

  it("doesn't take away the blogs people already wrote", async () => {
    const mine = await test.queryAs(STRANGER, 'select key from public.blogs');
    expect(mine).toHaveLength(1);
  });

  it('refuses an unknown handle or feature', async () => {
    await expect(blogs.grant('nobody_here')).rejects.toThrow(/no such handle/);
    await expect(asServiceRole(test, `select public.grant_feature_access('maps', null)`)).rejects.toThrow(
      /unknown feature/,
    );
  });

  it("can't be granted, read or checked by anyone but the server", async () => {
    await expect(test.queryAs(ALEX, `select public.grant_feature_access('blogs', 'alex')`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(test.queryAs(ALEX, `select public.revoke_feature_access('blogs', null)`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(test.queryAs(ALEX, 'select * from public.feature_access')).rejects.toThrow(/permission denied/);
    await expect(test.queryAs(undefined, `select public.has_feature_access('blogs')`)).rejects.toThrow(
      /permission denied/,
    );
  });
});
