import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackServer } from '@/lib/analytics/server';
import { expectNoProblems, validateEvent } from '@/lib/analytics/validate';
import { accountDeletedProperties, deleteAccount } from './accountDeletion';

// vi.mock is hoisted above the imports: a stand-in admin client, storage, PostHog sender and
// erasure, so the order of the steps can be checked without any network or database.
const fake = vi.hoisted(() => {
  const state = { steps: [] as string[], authUserGone: false, dataFails: false };
  const counts: Record<string, number> = { trips: 3, blogs: 1, follows: 2 };
  const admin = {
    rpc: async (name: string) => {
      state.steps.push(name);
      if (name === 'delete_account_data' && state.dataFails) return { data: null, error: { message: 'no' } };
      const result = { liked_or_commented_trip_keys: [], follow_profile_keys: [], own_trips: [], handles: [] };
      return { data: name === 'delete_account_data' ? result : null, error: null };
    },
    from: (table: string) => ({
      select: () => ({ eq: async () => ({ count: counts[table] ?? null, error: null }) }),
    }),
    auth: {
      admin: {
        getUserById: async () =>
          state.authUserGone
            ? { data: { user: null }, error: { status: 404 } }
            : { data: { user: { created_at: '2026-11-17T01:00:00Z' } }, error: null },
        deleteUser: async () => {
          state.steps.push('auth delete');
          return { error: null };
        },
      },
    },
  };
  return { state, admin };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => fake.admin }));
vi.mock('@/lib/storage', () => ({
  deleteUserFiles: async () => {
    fake.state.steps.push('files');
  },
}));
vi.mock('@/lib/analytics/server', () => ({
  trackServer: vi.fn(async (event: string) => {
    fake.state.steps.push(event);
  }),
}));
vi.mock('@/lib/analytics/erasure', () => ({
  erasureWindowStart: (now: Date) => now,
  eraseAnalytics: vi.fn(async () => {
    fake.state.steps.push('erase');
    return { posthog: 'done', bigquery: 'skipped' };
  }),
}));

const KEY = '0f8c06e0-ff8e-4996-ada5-c17de627ae88';

beforeEach(() => {
  fake.state.steps = [];
  fake.state.authUserGone = false;
  fake.state.dataFails = false;
  vi.mocked(trackServer).mockClear();
});

describe('accountDeletedProperties', () => {
  it('fills every account_deleted property from the counts', () => {
    const properties = accountDeletedProperties(
      { questCount: 3, blogCount: 1, followerCount: 2, signedUpAt: '2026-11-17T01:00:00Z' },
      new Date('2026-11-27T00:59:00Z'),
    );
    expectNoProblems('account_deleted', properties);
    expect(properties).toEqual({ quest_count: 3, blog_count: 1, follower_count: 2, days_since_signup: 9 });
  });

  it('leaves out a count it could not read instead of sending 0, and the event still validates', () => {
    const properties = accountDeletedProperties(
      { questCount: null, blogCount: 0, followerCount: 0, signedUpAt: null },
      new Date('2026-11-27T00:00:00Z'),
    );
    expect(JSON.parse(JSON.stringify(properties))).toEqual({ blog_count: 0, follower_count: 0 });
    expect(validateEvent('account_deleted', properties).problems).toEqual([
      'quest_count: missing',
      'days_since_signup: missing',
    ]);
  });
});

describe('deleteAccount analytics', () => {
  it('sends account_deleted after the data is gone, then erases', async () => {
    const result = await deleteAccount(KEY, () => {});
    expect(fake.state.steps).toEqual([
      'mark_account_deleted',
      'files',
      'delete_account_data',
      'auth delete',
      'account_deleted',
      'erase',
    ]);
    expect(trackServer).toHaveBeenCalledWith('account_deleted', KEY, {
      quest_count: 3,
      blog_count: 1,
      follower_count: 2,
      days_since_signup: expect.any(Number),
    });
    expect(result).toEqual({ posthog: 'done', bigquery: 'skipped' });
  });

  it('a repeat run (auth user already gone) erases again but sends no second account_deleted', async () => {
    fake.state.authUserGone = true;
    await deleteAccount(KEY, () => {});
    expect(trackServer).not.toHaveBeenCalled();
    expect(fake.state.steps).toContain('erase');
  });

  it('sends nothing and erases nothing when the data delete fails', async () => {
    fake.state.dataFails = true;
    await expect(deleteAccount(KEY, () => {})).rejects.toThrow();
    expect(fake.state.steps).not.toContain('account_deleted');
    expect(fake.state.steps).not.toContain('erase');
  });
});
