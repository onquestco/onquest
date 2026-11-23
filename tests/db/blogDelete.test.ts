import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { blogDocument, blogFunctions } from './blogHelpers';
import { ALEX, createTestDatabase, STRANGER } from './testDatabase';

// delete_blog is a real delete (0001 rule 7): the live rows and every archived row go, and a
// posted blog leaves a tombstone under every handle its writer has had, so old links say
// "This blog was removed." and the slug is never reused.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let test: Db;
let blogs: ReturnType<typeof blogFunctions>;

beforeAll(async () => {
  test = await createTestDatabase();
  blogs = blogFunctions(test);
  await test.addUser(STRANGER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
  await blogs.grant('alex');
}, 30_000);

const count = async (sql: string, params: unknown[] = []) =>
  Number((await test.db.query<{ n: number }>(sql, params)).rows[0]!.n);
const TABLES = ['blogs', 'blogs_archive', 'blog_drafts', 'blog_drafts_archive'];

describe('delete_blog', () => {
  it("can't delete someone else's blog", async () => {
    const { key } = await blogs.posted(ALEX, { slug: 'not-yours' });
    await expect(blogs.remove(STRANGER, key)).rejects.toThrow(/not found/);
    expect(await count('select count(*) n from public.blogs where key = $1', [key])).toBe(1);
  });

  it('removes every row and archive, and tombstones the link under the old and new handle', async () => {
    const { key, slug } = await blogs.posted(ALEX, { slug: 'goodbye-goa' });
    // Archive rows of both kinds: an autosave and a comments switch.
    await blogs.saveDraft(ALEX, key, (await blogs.tokens(ALEX, key)).draft, blogDocument({ body: 'edit' }));
    await blogs.setComments(ALEX, key, (await blogs.tokens(ALEX, key)).blog, false);
    const profile = (await test.queryAs<{ t: string }>(ALEX, 'select saved_at::text t from public.profiles'))[0]!;
    await test.queryAs(ALEX, `select public.save_profile($1, '{"handle": "alex_two", "name": "Alex"}')`, [
      profile.t,
    ]);
    for (const table of TABLES) {
      expect(await count(`select count(*) n from public.${table} where key = $1`, [key])).toBeGreaterThan(0);
    }

    expect(await blogs.remove(ALEX, key)).toEqual({ handles: ['alex', 'alex_two'], slug });
    for (const table of TABLES) {
      expect(await count(`select count(*) n from public.${table} where key = $1`, [key])).toBe(0);
    }
    expect(await blogs.getBlog('alex_two', slug)).toBeNull();
    expect(await blogs.status('alex_two', slug)).toBe('removed');
    expect(await blogs.status('alex', slug)).toBe('removed');
    // Only the blog URL: the same slug as a Quest isn't touched.
    expect(
      await count(
        `select count(*) n from public.removed_trip_urls where url_hash = public.trip_url_hash('alex_two', $1)`,
        [slug],
      ),
    ).toBe(0);
  });

  it('leaves no tombstone for a blog that was never posted', async () => {
    const key = randomUUID();
    await blogs.create(ALEX, key);
    const tombstones = await count('select count(*) n from public.removed_blog_urls');
    expect(await blogs.remove(ALEX, key)).toEqual({ handles: ['alex', 'alex_two'], slug: null });
    expect(await count('select count(*) n from public.removed_blog_urls')).toBe(tombstones);
    expect(await count('select count(*) n from public.blogs where key = $1', [key])).toBe(0);
  });

  it("leaves the writer's other blogs alone", async () => {
    expect(await blogs.getBlog('alex_two', 'not-yours')).toMatchObject({ blog: { slug: 'not-yours' } });
  });
});
