import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { blogDocument, blogFunctions } from './blogHelpers';
import { createSocialDatabase, GOA, GOKARNA, SECRET } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// Blog likes, comments and the viewer state (blogs spec §3.4, §3.6, §4.3 migration 17): the same
// rules as Quests (migration 10), on their own tables, sharing the bell and the comment limit.
// Alex writes; Sam (STRANGER) and Riya (NEWCOMER) read.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
let blogs: ReturnType<typeof blogFunctions>;
let publicBlog: string;
let unlistedBlog: string;
let privateBlog: string;
let draftBlog: string;

const notifications = (blogKey: string, kind: string) =>
  db.count('select count(*) n from public.notifications where blog_key = $1 and kind = $2', [blogKey, kind]);

beforeAll(async () => {
  db = await createSocialDatabase();
  blogs = blogFunctions(db);
  await blogs.grant('alex');
  publicBlog = (await blogs.posted(ALEX, { slug: 'goa-on-15k' })).key;
  unlistedBlog = (await blogs.posted(ALEX, { visibility: 'unlisted', slug: 'quiet-k3f9x2' })).key;
  privateBlog = (await blogs.posted(ALEX, { visibility: 'private', slug: 'just-me' })).key;
  draftBlog = randomUUID();
  await blogs.create(ALEX, draftBlog, blogDocument({ title: 'Not posted yet' }));
}, 30_000);

describe('set_blog_like', () => {
  it('is idempotent, and only the first like ever notifies (naming nobody)', async () => {
    expect(await blogs.like(STRANGER, publicBlog)).toEqual({ liked: true, notified: true, like_count: 1 });
    expect(await blogs.like(STRANGER, publicBlog)).toEqual({ liked: true, notified: false, like_count: 1 });
    expect(await blogs.like(STRANGER, publicBlog, false)).toEqual({ liked: false, notified: false, like_count: 0 });
    expect(await blogs.like(STRANGER, publicBlog, false)).toMatchObject({ like_count: 0 });
    expect(await blogs.like(STRANGER, publicBlog)).toEqual({ liked: true, notified: false, like_count: 1 });
    expect(await notifications(publicBlog, 'like')).toBe(1);
    expect(
      await db.count(
        `select count(*) n from public.notifications where blog_key = $1 and (actor_key is not null or trip_key is not null)`,
        [publicBlog],
      ),
    ).toBe(0);
    expect(await db.count('select count(*) n from public.blog_likes_archive where blog_key = $1', [publicBlog])).toBe(1);
  });

  it("doesn't notify writers about their own likes", async () => {
    expect(await blogs.like(ALEX, unlistedBlog)).toMatchObject({ liked: true, notified: false });
    expect(await notifications(unlistedBlog, 'like')).toBe(0);
  });

  it('lets anyone signed in like an unlisted blog, but nobody else a private one or a draft', async () => {
    expect(await blogs.like(NEWCOMER, unlistedBlog)).toMatchObject({ liked: true, notified: true });
    await expect(blogs.like(STRANGER, privateBlog)).rejects.toThrow(/not visible/);
    await expect(blogs.like(STRANGER, draftBlog)).rejects.toThrow(/not visible/);
    await expect(blogs.like(STRANGER, randomUUID())).rejects.toThrow(/not visible/);
  });

  it('needs sign-in', async () => {
    await expect(db.queryAs(undefined, 'select public.set_blog_like($1, true)', [publicBlog])).rejects.toThrow(
      /permission denied/,
    );
  });

  it('shows each person only their own likes', async () => {
    expect(await db.queryAs(STRANGER, 'select blog_key from public.blog_likes')).toEqual([{ blog_key: publicBlog }]);
    expect(await db.queryAs(STRANGER, 'select blog_key from public.blog_likes_archive')).toHaveLength(1);
    expect(await db.queryAs(ALEX, 'select blog_key from public.blog_likes_archive')).toEqual([]);
  });
});

describe('post_blog_comment', () => {
  it('posts, notifies the writer with the comment, and shows it newest last', async () => {
    await blogs.comment(STRANGER, publicBlog, '  First!  ');
    await blogs.comment(NEWCOMER, publicBlog, 'Which beach is this?');
    const social = await blogs.social(publicBlog);
    expect(social?.comments.map((comment) => comment.body)).toEqual(['First!', 'Which beach is this?']);
    expect(social?.comments[0]?.author.handle).toBe('sam');
    expect(social).toMatchObject({ comment_count: 2, like_count: 1, comments_on: true });
    expect(
      await db.count(
        `select count(*) n from public.notifications where blog_key = $1 and kind = 'comment' and actor_key = $2
           and comment_key is not null and trip_key is null`,
        [publicBlog, STRANGER],
      ),
    ).toBe(1);
  });

  it("doesn't notify writers about their own comments", async () => {
    await blogs.comment(ALEX, unlistedBlog, 'Thanks for reading!');
    expect(await notifications(unlistedBlog, 'comment')).toBe(0);
  });

  it('refuses private, draft and empty comments', async () => {
    await expect(blogs.comment(STRANGER, privateBlog, 'Hello')).rejects.toThrow(/not visible/);
    await expect(blogs.comment(ALEX, draftBlog, 'On my own draft')).rejects.toThrow(/not visible/);
    await expect(blogs.comment(STRANGER, publicBlog, '   ')).rejects.toThrow(/invalid comment/);
    await expect(blogs.comment(STRANGER, publicBlog, 'x'.repeat(301))).rejects.toThrow(/invalid comment/);
  });

  it('nobody reads the comments table directly', async () => {
    await expect(db.queryAs(ALEX, 'select * from public.blog_comments')).rejects.toThrow(/permission denied/);
    await expect(db.queryAs(undefined, 'select * from public.blog_comments')).rejects.toThrow(/permission denied/);
  });
});

describe('get_blog_social', () => {
  it('answers for posted public and unlisted blogs only', async () => {
    expect(await blogs.social(unlistedBlog)).toMatchObject({ like_count: 2, comment_count: 1 });
    expect(await blogs.social(privateBlog)).toBeNull();
    expect(await blogs.social(privateBlog, ALEX)).toBeNull(); // the owner reads it at /blogs/[key]
    expect(await blogs.social(draftBlog)).toBeNull();
  });
});

describe('comments off', () => {
  it('hides every comment and blocks new ones; turning them on shows them again', async () => {
    const offAt = await blogs.setComments(ALEX, publicBlog, (await blogs.tokens(ALEX, publicBlog)).blog, false);
    expect(await blogs.social(publicBlog)).toMatchObject({ comments_on: false, comment_count: 0, comments: [] });
    await expect(blogs.comment(STRANGER, publicBlog, 'Still here?')).rejects.toThrow(/comments off/);
    await blogs.setComments(ALEX, publicBlog, offAt, true);
    expect((await blogs.social(publicBlog))?.comment_count).toBe(2);
  });
});

describe('delete_blog_comment', () => {
  it('only the writer can delete, and the comment is archived', async () => {
    const { key } = await blogs.comment(STRANGER, unlistedBlog, 'Rude words');
    await expect(blogs.deleteComment(STRANGER, key)).rejects.toThrow(/not owner/);
    await expect(blogs.deleteComment(NEWCOMER, key)).rejects.toThrow(/not owner/);
    await expect(blogs.deleteComment(ALEX, randomUUID())).rejects.toThrow(/not found/);
    expect(await blogs.deleteComment(ALEX, key)).toBe(unlistedBlog);
    expect((await blogs.social(unlistedBlog))?.comments.some((comment) => comment.key === key)).toBe(false);
    expect(await db.count('select count(*) n from public.blog_comments_archive where key = $1', [key])).toBe(1);
    // The author can still see their own deleted comment; the writer can't read the archive.
    expect(await db.queryAs(STRANGER, 'select key from public.blog_comments_archive where key = $1', [key])).toHaveLength(1);
    expect(await db.queryAs(ALEX, 'select key from public.blog_comments_archive where key = $1', [key])).toHaveLength(0);
  });

  it('a Post, visibility change or comments switch deletes no like, comment or notification', async () => {
    const key = (await blogs.posted(ALEX, { slug: 'social-safe' })).key;
    await blogs.like(NEWCOMER, key);
    await blogs.comment(STRANGER, key, 'Lovely');
    const counts = async () => [
      await db.count('select count(*) n from public.blog_likes where blog_key = $1', [key]),
      await db.count('select count(*) n from public.blog_comments where blog_key = $1', [key]),
      await db.count('select count(*) n from public.notifications where blog_key = $1', [key]),
    ];
    const before = await counts();
    const tokens = await blogs.tokens(ALEX, key);
    await blogs.saveDraft(ALEX, key, tokens.draft, blogDocument({ body: 'Edited.' }));
    await blogs.publish(ALEX, key, { visibility: null });
    await blogs.setVisibility(ALEX, key, (await blogs.tokens(ALEX, key)).blog, 'unlisted');
    await blogs.setComments(ALEX, key, (await blogs.tokens(ALEX, key)).blog, false);
    expect(await counts()).toEqual(before);
    expect(before).toEqual([1, 1, 2]);
  });
});

describe('get_my_blog_state', () => {
  it('tells a reader whether they liked it, and nothing of the writer’s', async () => {
    const state = await blogs.myState(STRANGER, publicBlog);
    expect(state).toEqual({ liked: true, is_owner: false });
    expect(await blogs.myState(STRANGER, privateBlog)).toEqual({ liked: false, is_owner: false });
  });

  it('gives the writer the ⋯ menu token, visibility and comments switch', async () => {
    const state = await blogs.myState(ALEX, publicBlog);
    expect(state).toMatchObject({
      liked: false,
      is_owner: true,
      saved_at: (await blogs.tokens(ALEX, publicBlog)).blog,
      visibility: 'public',
      comments_on: true,
      linked_quest_hidden: false,
    });
    expect(state).not.toHaveProperty('own_linked_quest');
  });

  it.each([
    ['public', GOA, false],
    ['public', GOKARNA, true],
    ['public', SECRET, true],
    ['unlisted', GOA, false],
    ['unlisted', GOKARNA, false],
    ['unlisted', SECRET, true],
    ['private', GOA, true],
  ])(
    'a %s blog linking Quest %s: the writer is told it is hidden from readers: %s',
    async (visibility, questKey, hidden) => {
      const key = (
        await blogs.posted(ALEX, {
          visibility: visibility as string,
          slug: `linked-${randomUUID().slice(0, 8)}`,
          document: blogDocument({ linkedQuestKey: questKey }),
        })
      ).key;
      const mine = await blogs.myState(ALEX, key);
      expect(mine.linked_quest_hidden).toBe(hidden);
      if (hidden) expect(mine.own_linked_quest).toMatchObject({ key: questKey });
      else expect(mine).not.toHaveProperty('own_linked_quest');
      const theirs = await blogs.myState(STRANGER, key);
      expect(theirs).not.toHaveProperty('linked_quest_hidden');
      expect(theirs).not.toHaveProperty('own_linked_quest');
    },
  );
});

describe('the comment limit counts Quest and blog comments together (spec D13)', () => {
  let fresh: Awaited<ReturnType<typeof createSocialDatabase>>;
  let freshBlogs: ReturnType<typeof blogFunctions>;
  let blog: string;

  beforeAll(async () => {
    fresh = await createSocialDatabase();
    freshBlogs = blogFunctions(fresh);
    await freshBlogs.grant('alex');
    blog = (await freshBlogs.posted(ALEX, { slug: 'limit' })).key;
  }, 30_000);

  it('5 Quest comments, then a blog comment is refused', async () => {
    for (let i = 0; i < 5; i++) await fresh.comment(STRANGER, GOA, `Quest comment ${i}`);
    await expect(freshBlogs.comment(STRANGER, blog, 'One too many')).rejects.toThrow(/too fast/);
  });

  it('5 blog comments, then a Quest comment is refused', async () => {
    for (let i = 0; i < 5; i++) await freshBlogs.comment(NEWCOMER, blog, `Blog comment ${i}`);
    await expect(fresh.comment(NEWCOMER, GOA, 'One too many')).rejects.toThrow(/too fast/);
    await expect(freshBlogs.comment(NEWCOMER, blog, 'Still too many')).rejects.toThrow(/too fast/);
  });
});
