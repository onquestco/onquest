import { createTestDatabase, NEWCOMER, STRANGER } from './testDatabase';

// A database with three people: Alex (seed: public, unlisted and private Quests), Sam and Riya.

export const GOA = '00000000-0000-4000-8000-0000000000a1'; // public
export const GOKARNA = '00000000-0000-4000-8000-0000000000a2'; // unlisted
export const SECRET = '00000000-0000-4000-8000-0000000000a3'; // private

export async function createSocialDatabase() {
  const test = await createTestDatabase();
  await test.addUser(STRANGER);
  await test.addUser(NEWCOMER);
  await test.queryAs(STRANGER, `select public.save_profile(null, '{"handle": "sam", "name": "Sam"}')`);
  await test.queryAs(NEWCOMER, `select public.save_profile(null, '{"handle": "riya", "name": "Riya"}')`);
  const one = async <T>(user: string | undefined, sql: string, params: unknown[] = []) =>
    (await test.queryAs<{ result: T }>(user, sql, params))[0]!.result;
  const count = async (sql: string, params: unknown[] = []) =>
    Number((await test.db.query<{ n: number }>(sql, params)).rows[0]!.n);
  return {
    ...test,
    one,
    count,
    like: (user: string, trip: string, liked = true) =>
      one<{ liked: boolean; like_count: number }>(user, 'select public.set_like($1, $2) as result', [
        trip,
        liked,
      ]),
    comment: (user: string, trip: string, body: string) =>
      one<{ key: string; saved_at: string }>(user, 'select public.post_comment($1, $2) as result', [
        trip,
        body,
      ]),
    social: (trip: string) =>
      one<{
        like_count: number;
        comment_count: number;
        comments_on: boolean;
        comments: { key: string; body: string; author: { handle: string } }[];
      } | null>(undefined, 'select public.get_trip_social($1) as result', [trip]),
  };
}
