import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase, GOA, GOKARNA, SECRET } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// Likes (spec B §3.3): one per person, set-state taps, anonymous to everyone but the liker.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
beforeAll(async () => {
  db = await createSocialDatabase();
}, 30_000);

describe('set_like', () => {
  it('counts one like per person however many times they tap', async () => {
    await db.like(STRANGER, GOA);
    const result = await db.like(STRANGER, GOA);
    expect(result).toEqual({ liked: true, like_count: 1 });
    expect((await db.social(GOA))?.like_count).toBe(1);
  });

  it('archives the like on unlike, and a second unlike changes nothing', async () => {
    expect(await db.like(STRANGER, GOA, false)).toEqual({ liked: false, like_count: 0 });
    expect(await db.like(STRANGER, GOA, false)).toEqual({ liked: false, like_count: 0 });
    expect(await db.count('select count(*) n from public.likes_archive where trip_key = $1', [GOA])).toBe(1);
  });

  it('notifies the owner on the first like only, never again after unlike and re-like', async () => {
    await db.like(NEWCOMER, GOA);
    await db.like(NEWCOMER, GOA, false);
    await db.like(NEWCOMER, GOA);
    expect(
      await db.count(`select count(*) n from public.notifications where kind = 'like' and saved_by = $1`, [
        NEWCOMER,
      ]),
    ).toBe(1);
    // Sam's like earlier notified once too.
    expect(
      await db.count(`select count(*) n from public.notifications where kind = 'like' and trip_key = $1`, [
        GOA,
      ]),
    ).toBe(2);
  });

  it("doesn't notify owners about their own likes", async () => {
    await db.like(ALEX, GOKARNA);
    expect(await db.count(`select count(*) n from public.notifications where trip_key = $1`, [GOKARNA])).toBe(
      0,
    );
  });

  it("can't like someone else's private Quest, but the owner can", async () => {
    await expect(db.like(STRANGER, SECRET)).rejects.toThrow(/not visible/);
    expect((await db.like(ALEX, SECRET)).liked).toBe(true);
  });

  it('needs sign-in', async () => {
    await expect(db.queryAs(undefined, 'select public.set_like($1, true)', [GOA])).rejects.toThrow(
      /permission denied/,
    );
  });

  it('never tells the owner who liked: not in notifications, not in the likes they can read', async () => {
    const notifications = await db.queryAs<{ actor_key: string | null }>(
      ALEX,
      `select actor_key from public.notifications where kind = 'like'`,
    );
    expect(notifications.length > 0).toBe(true);
    expect(notifications.every((row) => row.actor_key === null)).toBe(true);
    expect(await db.queryAs(ALEX, 'select * from public.likes where user_key <> $1', [ALEX])).toEqual([]);
    expect(JSON.stringify(await db.social(GOA))).not.toContain(NEWCOMER);
  });

  it('tells the viewer whether they liked it and whether it is theirs', async () => {
    expect(await db.one(NEWCOMER, 'select public.get_my_quest_state($1) as result', [GOA])).toEqual({
      liked: true,
      is_owner: false,
    });
    expect(await db.one(ALEX, 'select public.get_my_quest_state($1) as result', [GOA])).toEqual({
      liked: false,
      is_owner: true,
    });
  });
});
