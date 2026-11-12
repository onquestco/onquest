import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase, GOA, GOKARNA, SECRET } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';
import { questDocument, tripFunctions } from './tripHelpers';

// Comments (spec B §3.4): visible Quests only, comments off hides and blocks, only the owner
// deletes, 5 a minute per person.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
beforeAll(async () => {
  db = await createSocialDatabase();
}, 30_000);

describe('post_comment', () => {
  it('posts, notifies the owner with the comment, and shows it newest last', async () => {
    await db.comment(STRANGER, GOA, '  First!  ');
    await db.comment(NEWCOMER, GOA, 'Which beach is this?');
    const social = await db.social(GOA);
    expect(social?.comments.map((comment) => comment.body)).toEqual(['First!', 'Which beach is this?']);
    expect(social?.comments[0]?.author.handle).toBe('sam');
    expect(social?.comment_count).toBe(2);
    expect(
      await db.count(
        `select count(*) n from public.notifications where kind = 'comment' and actor_key = $1`,
        [STRANGER],
      ),
    ).toBe(1);
  });

  it("doesn't notify owners about their own comments", async () => {
    await db.comment(ALEX, GOKARNA, 'Thanks for looking!');
    expect(await db.count(`select count(*) n from public.notifications where trip_key = $1`, [GOKARNA])).toBe(
      0,
    );
  });

  it('refuses private, draft and empty comments', async () => {
    await expect(db.comment(STRANGER, SECRET, 'Hello')).rejects.toThrow(/not visible/);
    const trips = tripFunctions(db.queryAs);
    const draft = randomUUID();
    await trips.create(ALEX, draft);
    await expect(db.comment(ALEX, draft, 'On my own draft')).rejects.toThrow(/not visible/);
    await expect(db.comment(STRANGER, GOA, '   ')).rejects.toThrow(/invalid comment/);
    await expect(db.comment(STRANGER, GOA, 'x'.repeat(301))).rejects.toThrow(/invalid comment/);
  });

  it('allows 5 comments a minute per person', async () => {
    for (let i = 0; i < 4; i++) await db.comment(NEWCOMER, GOKARNA, `Comment ${i}`);
    await expect(db.comment(NEWCOMER, GOKARNA, 'One too many')).rejects.toThrow(/too fast/);
  });
});

describe('comments off', () => {
  it('hides every comment and blocks new ones; turning them on shows them again', async () => {
    const trips = tripFunctions(db.queryAs);
    const { trip } = await trips.rows(ALEX, GOA);
    const offAt = await trips.setComments(ALEX, GOA, trip!.saved_at_text, false);
    expect(await db.social(GOA)).toMatchObject({ comments_on: false, comment_count: 0, comments: [] });
    await expect(db.comment(STRANGER, GOA, 'Still here?')).rejects.toThrow(/comments off/);
    await trips.setComments(ALEX, GOA, offAt, true);
    expect((await db.social(GOA))?.comment_count).toBe(2);
  });
});

describe('delete_comment', () => {
  it('only the Quest owner can delete, and the comment is archived', async () => {
    const { key } = await db.comment(STRANGER, GOA, 'Rude words');
    await expect(db.queryAs(STRANGER, 'select public.delete_comment($1)', [key])).rejects.toThrow(
      /not owner/,
    );
    await expect(db.queryAs(NEWCOMER, 'select public.delete_comment($1)', [key])).rejects.toThrow(
      /not owner/,
    );
    await db.queryAs(ALEX, 'select public.delete_comment($1)', [key]);
    expect((await db.social(GOA))?.comments.some((comment) => comment.key === key)).toBe(false);
    expect(await db.count('select count(*) n from public.comments_archive where key = $1', [key])).toBe(1);
    // The author can still see their own deleted comment; the owner can't read the archive.
    expect(
      await db.queryAs(STRANGER, 'select key from public.comments_archive where key = $1', [key]),
    ).toHaveLength(1);
    expect(
      await db.queryAs(ALEX, 'select key from public.comments_archive where key = $1', [key]),
    ).toHaveLength(0);
  });

  it('nobody reads the comments table directly', async () => {
    await expect(db.queryAs(ALEX, 'select * from public.comments')).rejects.toThrow(/permission denied/);
  });

  it('a publish, visibility change or comments switch deletes no like, comment or notification', async () => {
    const trips = tripFunctions(db.queryAs);
    const key = randomUUID();
    await trips.create(ALEX, key);
    const fresh = async () => {
      const rows = await trips.rows(ALEX, key);
      return { trip: rows.trip!.saved_at_text, draft: rows.draft!.saved_at_text };
    };
    await trips.saveDraft(ALEX, key, (await fresh()).draft, questDocument(3));
    await trips.publish(ALEX, key, await fresh(), { slug: 'social-safe' });
    await db.like(NEWCOMER, key);
    await db.comment(STRANGER, key, 'Lovely'); // Riya already used her 5 comments this minute
    const counts = async () => [
      await db.count('select count(*) n from public.likes where trip_key = $1', [key]),
      await db.count('select count(*) n from public.comments where trip_key = $1', [key]),
      await db.count('select count(*) n from public.notifications where trip_key = $1', [key]),
    ];
    const before = await counts();
    await trips.saveDraft(ALEX, key, (await fresh()).draft, questDocument(4));
    await trips.publish(ALEX, key, await fresh());
    await trips.setVisibility(ALEX, key, (await fresh()).trip, 'unlisted');
    await trips.setComments(ALEX, key, (await fresh()).trip, false);
    await db.queryAs(STRANGER, `select public.save_profile($1, '{"handle": "sam", "name": "Sam S"}')`, [
      (await db.queryAs<{ s: string }>(STRANGER, 'select saved_at::text s from public.profiles'))[0]!.s,
    ]);
    expect(await counts()).toEqual(before);
    expect(before).toEqual([1, 1, 2]);
  });
});
