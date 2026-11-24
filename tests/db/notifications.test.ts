import { beforeAll, describe, expect, it } from 'vitest';
import { blogFunctions } from './blogHelpers';
import { createSocialDatabase, GOA, GOKARNA } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// The bell (spec B §3.5): recipient only, likes grouped and anonymous, read state moves forward.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
type Item = {
  key: string;
  kind: string;
  unread: boolean;
  like_count?: number;
  actor?: { handle: string };
  quest?: { key: string; path: string; title: string };
  blog?: { key: string; path: string; title: string; photo_folder: string; cover_photo_key?: string };
  comment_excerpt?: string;
};
const list = (user: string) => db.one<Item[]>(user, 'select public.list_my_notifications() as result');
const unread = (user: string) => db.one<number>(user, 'select public.count_unread_notifications() as result');

beforeAll(async () => {
  db = await createSocialDatabase();
  await db.like(STRANGER, GOA);
  await db.like(NEWCOMER, GOA);
  await db.comment(NEWCOMER, GOKARNA, 'x'.repeat(100));
}, 30_000);

describe('list_my_notifications', () => {
  it('groups likes per Quest per day without naming anyone, and shows comments with who and what', async () => {
    const items = await list(ALEX);
    expect(items.map((item) => item.kind)).toEqual(['comment', 'like']);
    const [comment, likes] = items;
    expect(likes).toMatchObject({
      kind: 'like',
      like_count: 2,
      unread: true,
      quest: { key: GOA, path: '/@alex/goa-2026' },
    });
    expect(likes).not.toHaveProperty('actor');
    expect(comment).toMatchObject({ actor: { handle: 'riya' }, quest: { path: '/@alex/gokarna-k3f9x2' } });
    expect(comment?.comment_excerpt).toHaveLength(80);
  });

  it('is only ever the signed-in person’s own', async () => {
    expect(await list(STRANGER)).toEqual([]);
    expect(await db.queryAs(STRANGER, 'select * from public.notifications')).toEqual([]);
  });

  it('shows a deleted comment without its words', async () => {
    const [comment] = await list(ALEX);
    const key = (
      await db.db.query<{ comment_key: string }>(
        `select comment_key from public.notifications where kind = 'comment'`,
      )
    ).rows[0]!.comment_key;
    await db.queryAs(ALEX, 'select public.delete_comment($1)', [key]);
    const [after] = await list(ALEX);
    expect(after?.key).toBe(comment?.key);
    expect(after).not.toHaveProperty('comment_excerpt');
  });
});

describe('unread and seen', () => {
  it('counts unread until the bell is opened', async () => {
    expect(await unread(ALEX)).toBe(3);
    await db.one(ALEX, 'select public.mark_notifications_seen($1) as result', [new Date().toISOString()]);
    expect(await unread(ALEX)).toBe(0);
    expect((await list(ALEX)).every((item) => !item.unread)).toBe(true);
  });

  it('only moves forward: an older "seen" from another device changes nothing', async () => {
    const before = await db.queryAs<{ seen: string }>(
      ALEX,
      'select seen_until::text seen from public.notification_reads',
    );
    await db.one(ALEX, 'select public.mark_notifications_seen($1) as result', ['2020-01-01T00:00:00Z']);
    const after = await db.queryAs<{ seen: string }>(
      ALEX,
      'select seen_until::text seen from public.notification_reads',
    );
    expect(after).toEqual(before);
  });

  it('archives the old read row when it moves', async () => {
    await db.like(STRANGER, GOKARNA);
    expect(await unread(ALEX)).toBe(1);
    await db.one(ALEX, 'select public.mark_notifications_seen($1) as result', [
      new Date(Date.now() + 1000).toISOString(),
    ]);
    expect(await unread(ALEX)).toBe(0);
    expect(
      await db.count('select count(*) n from public.notification_reads_archive where key = $1', [ALEX]),
    ).toBe(1);
  });
});

describe('blog notifications (migration 17)', () => {
  let test: Awaited<ReturnType<typeof createSocialDatabase>>;
  let blogKey: string;
  const items = () => test.one<Item[]>(ALEX, 'select public.list_my_notifications() as result');

  beforeAll(async () => {
    test = await createSocialDatabase();
    const blogs = blogFunctions(test);
    await blogs.grant('alex');
    blogKey = (await blogs.posted(ALEX, { slug: 'goa-on-15k' })).key;
    await test.like(STRANGER, GOA); // a Quest like the same day, grouped apart from the blog's
    await blogs.like(STRANGER, blogKey);
    await blogs.like(NEWCOMER, blogKey);
    await blogs.comment(NEWCOMER, blogKey, 'Which beach is this?');
  }, 30_000);

  it("groups a blog's likes apart from a Quest's, and links to the blog", async () => {
    const [comment, blogLikes, questLikes] = await items();
    expect(blogLikes).toMatchObject({
      kind: 'like',
      like_count: 2,
      blog: { key: blogKey, title: 'Goa on 15k', path: '/@alex/blog/goa-on-15k' },
    });
    expect(blogLikes).not.toHaveProperty('quest');
    expect(blogLikes).not.toHaveProperty('actor');
    expect(blogLikes?.blog?.photo_folder).toBe(`${ALEX}/${blogKey}`);
    expect(blogLikes?.blog).toHaveProperty('cover_photo_key');
    expect(questLikes).toMatchObject({ kind: 'like', like_count: 1, quest: { key: GOA } });
    expect(questLikes).not.toHaveProperty('blog');
    expect(comment).toMatchObject({
      kind: 'comment',
      actor: { handle: 'riya' },
      blog: { key: blogKey },
      comment_excerpt: 'Which beach is this?',
    });
  });

  it('counts blog notifications as unread like any other (one per row, as for Quests)', async () => {
    expect(await test.one<number>(ALEX, 'select public.count_unread_notifications() as result')).toBe(4);
  });

  it('keeps a row about one thing only: a Quest or a blog', async () => {
    await expect(
      test.db.query(
        `insert into public.notifications (key, recipient_key, kind, trip_key, blog_key, saved_at, save_reason)
         values (gen_random_uuid(), $1, 'like', $2, $3, now(), 'create')`,
        [ALEX, GOA, blogKey],
      ),
    ).rejects.toThrow(/notifications_one_subject/);
  });
});
