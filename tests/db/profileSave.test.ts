import { beforeAll, describe, expect, it } from 'vitest';
import { ALEX, createTestDatabase, NEWCOMER, STRANGER } from './testDatabase';

// save_profile under decision 0001: archive + insert, conflict on a stale saved_at, handles
// claimed for good, and nothing else touched.

type Db = Awaited<ReturnType<typeof createTestDatabase>>;
let db: Db['db'];
let queryAs: Db['queryAs'];

beforeAll(async () => {
  const test = await createTestDatabase();
  ({ db, queryAs } = test);
  await test.addUser(STRANGER);
  await test.addUser(NEWCOMER);
}, 30_000);

const save = async (userId: string, basedOn: string | null, profile: Record<string, unknown>) =>
  (
    await queryAs<{ saved_at: string }>(userId, 'select public.save_profile($1, $2) as saved_at', [
      basedOn,
      profile,
    ])
  )[0]!.saved_at;

const liveAs = async (userId: string) =>
  (
    await queryAs<Record<string, unknown>>(
      userId,
      'select *, saved_at::text as saved_at_text from public.profiles',
    )
  )[0];

const count = async (sql: string, params: unknown[] = []) =>
  Number((await db.query<{ n: number }>(sql, params)).rows[0]!.n);

describe('creating a profile', () => {
  it('creates the profile and claims the handle', async () => {
    const savedAt = await save(NEWCOMER, null, { handle: 'Riya_Travels', name: 'Riya' });
    const live = await liveAs(NEWCOMER);
    expect(live).toMatchObject({ handle: 'riya_travels', name: 'Riya', save_reason: 'create', settings: {} });
    expect(live?.saved_at_text).toBe(savedAt);
    expect(await count(`select count(*) n from public.handle_claims where handle = 'riya_travels'`)).toBe(1);
  });

  it('refuses a second create', async () => {
    await expect(save(NEWCOMER, null, { handle: 'riya_two', name: 'Riya' })).rejects.toThrow(
      /profile exists/,
    );
  });

  it('refuses a handle someone else has', async () => {
    await expect(save(STRANGER, null, { handle: 'alex', name: 'Not Alex' })).rejects.toThrow(/handle taken/);
  });

  it('refuses reserved and malformed handles', async () => {
    await expect(save(STRANGER, null, { handle: 'explore', name: 'S' })).rejects.toThrow(/reserved/);
    await expect(save(STRANGER, null, { handle: 'no spaces', name: 'S' })).rejects.toThrow(/invalid handle/);
  });

  it('requires sign-in', async () => {
    await expect(
      queryAs(undefined, `select public.save_profile(null, '{"handle":"ghost"}')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('saving a profile', () => {
  it('archives the old row and inserts the new one under the same key', async () => {
    const before = await liveAs(ALEX);
    const savedAt = await save(ALEX, before!.saved_at_text as string, {
      handle: 'alex',
      name: 'Alex M.',
      bio: 'New bio',
      home_city: 'Pune',
    });
    const after = await liveAs(ALEX);
    expect(after).toMatchObject({
      key: ALEX,
      name: 'Alex M.',
      bio: 'New bio',
      save_reason: 'save',
      saved_by: ALEX,
    });
    expect(after?.saved_at_text).toBe(savedAt);
    // created_at and settings carry over untouched.
    expect(after?.created_at).toEqual(before?.created_at);
    expect(after?.settings).toEqual(before?.settings);
    const archived = await queryAs(ALEX, 'select name, bio from public.profiles_archive where key = $1', [
      ALEX,
    ]);
    expect(archived).toEqual([{ name: 'Alex Morgan', bio: 'Made of memories, miles, and moments' }]);
  });

  it('fails with a conflict on a stale saved_at', async () => {
    await expect(save(ALEX, '2000-01-01 00:00:00+00', { handle: 'alex', name: 'Stale' })).rejects.toThrow(
      /conflict/,
    );
  });

  it('deletes nothing else: trips, photos and places stay', async () => {
    const counts = async () => [
      await count('select count(*) n from public.trips where owner_id = $1', [ALEX]),
      await count('select count(*) n from public.photos where owner_id = $1', [ALEX]),
      await count(
        'select count(*) n from public.places pl join public.trips t on t.id = pl.trip_id where t.owner_id = $1',
        [ALEX],
      ),
    ];
    const before = await counts();
    const live = await liveAs(ALEX);
    await save(ALEX, live!.saved_at_text as string, { handle: 'alex', name: 'Alex Again' });
    expect(await counts()).toEqual(before);
    expect(before[0]).toBe(3);
  });

  it('keeps the old handle claimed after a rename, so nobody else can take it', async () => {
    const live = await liveAs(NEWCOMER);
    await save(NEWCOMER, live!.saved_at_text as string, { handle: 'riya_new', name: 'Riya' });
    await expect(save(STRANGER, null, { handle: 'riya_travels', name: 'Copycat' })).rejects.toThrow(
      /handle taken/,
    );
    expect(await queryAs(STRANGER, `select public.is_handle_available('riya_travels') as ok`)).toEqual([
      { ok: false },
    ]);
    expect(await queryAs(NEWCOMER, `select public.is_handle_available('riya_travels') as ok`)).toEqual([
      { ok: true },
    ]);
  });

  it("is a conflict when another device's save landed first", async () => {
    const live = await liveAs(NEWCOMER);
    const basedOn = live!.saved_at_text as string;
    await save(NEWCOMER, basedOn, { handle: 'riya_new', name: 'Phone' });
    await expect(save(NEWCOMER, basedOn, { handle: 'riya_new', name: 'Laptop' })).rejects.toThrow(/conflict/);
  });
});

describe('direct writes', () => {
  it.each([
    [`insert into public.profiles (key, handle) values ('${STRANGER}', 'sneaky')`],
    [`update public.profiles set name = 'x'`],
    [`delete from public.profiles`],
    [
      `insert into public.handle_claims (handle, profile_key, saved_at, save_reason) values ('grab', '${STRANGER}', now(), 'create')`,
    ],
  ])('are refused: %s', async (sql) => {
    await expect(queryAs(STRANGER, sql)).rejects.toThrow(/permission denied/);
  });

  it('service role can no longer update profiles', async () => {
    await db.exec('set role service_role');
    try {
      await expect(db.query(`update public.profiles set name = 'x'`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });

  it("can't read other people's profiles or archives", async () => {
    expect(await queryAs(STRANGER, 'select key from public.profiles')).toEqual([]);
    expect(await queryAs(STRANGER, 'select key from public.profiles_archive')).toEqual([]);
  });
});
