import { beforeAll, describe, expect, it } from 'vitest';
import { createSocialDatabase } from './socialHelpers';
import { ALEX, NEWCOMER, STRANGER } from './testDatabase';

// Follows (spec C §3.3): set-state taps, unfollow archives, first follow notifies once.

let db: Awaited<ReturnType<typeof createSocialDatabase>>;
const follow = (user: string, target: string, on = true) =>
  db.one<{ following: boolean; notified: boolean; follower_count: number }>(
    user,
    'select public.set_follow($1, $2) as result',
    [target, on],
  );

beforeAll(async () => {
  db = await createSocialDatabase();
}, 30_000);

describe('set_follow', () => {
  it('counts one follow however many times they tap, and notifies once', async () => {
    expect(await follow(STRANGER, ALEX)).toEqual({ following: true, notified: true, follower_count: 1 });
    expect(await follow(STRANGER, ALEX)).toEqual({ following: true, notified: false, follower_count: 1 });
  });

  it('archives on unfollow and never notifies again on a re-follow', async () => {
    expect(await follow(STRANGER, ALEX, false)).toMatchObject({ following: false, follower_count: 0 });
    expect(await db.count('select count(*) n from public.follows_archive')).toBe(1);
    expect((await follow(STRANGER, ALEX)).notified).toBe(false);
    expect(
      await db.count(`select count(*) n from public.notifications where kind = 'follow' and actor_key = $1`, [
        STRANGER,
      ]),
    ).toBe(1);
  });

  it("refuses following yourself or someone who doesn't exist", async () => {
    await expect(follow(ALEX, ALEX)).rejects.toThrow(/yourself/);
    await expect(follow(ALEX, '00000000-0000-4000-8000-00000000dead')).rejects.toThrow(/not found/);
  });

  it('needs sign-in', async () => {
    await expect(db.queryAs(undefined, 'select public.set_follow($1, true)', [ALEX])).rejects.toThrow(
      /permission denied/,
    );
  });

  it('lists followers and following, and which of them I follow', async () => {
    await follow(NEWCOMER, ALEX);
    const followers = await db.one<{ handle: string }[]>(
      ALEX,
      `select public.list_follows($1, 'followers', 30, 0) as result`,
      [ALEX],
    );
    expect(followers.map((person) => person.handle).sort()).toEqual(['riya', 'sam']);
    const mine = await db.one<string[]>(STRANGER, 'select public.get_my_follow_state($1) as result', [
      [ALEX, NEWCOMER],
    ]);
    expect(mine).toEqual([ALEX]);
  });

  it('shows the counts on the profile', async () => {
    const profile = await db.one<{ stats: { followers: number; following: number } }>(
      undefined,
      `select public.get_profile('alex') as result`,
    );
    expect(profile.stats).toMatchObject({ followers: 2, following: 0 });
  });

  it('lets people read only follows they are part of', async () => {
    expect(await db.queryAs(ALEX, 'select * from public.follows')).toHaveLength(2);
    await follow(STRANGER, NEWCOMER);
    expect(await db.queryAs(ALEX, 'select * from public.follows')).toHaveLength(2);
  });
});
