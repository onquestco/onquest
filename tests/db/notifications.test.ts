import { beforeAll, describe, expect, it } from 'vitest';
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
