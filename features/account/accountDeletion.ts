import 'server-only';
import { z } from 'zod';
import { eraseAnalytics, erasureWindowStart, type ErasureResult } from '@/lib/analytics/erasure';
import { trackServer } from '@/lib/analytics/server';
import type { EventProps } from '@/lib/analytics/taxonomy';
import { deleteUserFiles } from '@/lib/storage';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { tagsToRefresh } from './deletionTags';

// Deleting an account (spec C §3.9), every step safe to repeat: the action runs it, the daily job
// finishes any that stopped halfway, and sign-in finishes it if the person comes back first.

const ResultSchema = z.object({
  liked_or_commented_trip_keys: z.array(z.uuid()),
  follow_profile_keys: z.array(z.uuid()),
  own_trips: z.array(z.object({ key: z.uuid(), slug: z.string() })),
  handles: z.array(z.string()),
  // Blogs (migrations 16 and 17). Defaults, so code and migration can deploy in either order.
  own_blogs: z.array(z.object({ key: z.uuid(), slug: z.string() })).default([]),
  liked_or_commented_blog_keys: z.array(z.uuid()).default([]),
});

const AUTH_DELETE_ATTEMPTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type Admin = ReturnType<typeof createAdminSupabase>;

/** What account_deleted reports, read before anything is removed. null = unknown (a failed read). */
export type DeletionCounts = {
  questCount: number | null;
  blogCount: number | null;
  followerCount: number | null;
  signedUpAt: string | null;
};

/** account_deleted's properties: counts only (spec §5.2). */
export function accountDeletedProperties(counts: DeletionCounts, now: Date): EventProps<'account_deleted'> {
  const signedUp = counts.signedUpAt === null ? Number.NaN : Date.parse(counts.signedUpAt);
  const days = Number.isNaN(signedUp) ? undefined : Math.max(0, Math.floor((now.getTime() - signedUp) / DAY_MS));
  const properties = {
    quest_count: counts.questCount ?? undefined,
    blog_count: counts.blogCount ?? undefined,
    follower_count: counts.followerCount ?? undefined,
    days_since_signup: days,
  };
  // A count we couldn't read is left out rather than sent as 0: validation reports it by name and
  // the event is still sent (spec §4.2).
  return properties as EventProps<'account_deleted'>;
}

/**
 * The counts, or null when the auth user is already gone: an earlier run finished the deletion
 * and sent account_deleted, so a repeat run sends nothing (counts only on a state change, §10).
 */
async function countsBeforeDeletion(admin: Admin, userKey: string): Promise<DeletionCounts | null> {
  const authUser = await admin.auth.admin.getUserById(userKey);
  if (authUser.error?.status === 404) return null;
  const count = (table: string, column: string, ownerColumn: string) =>
    admin.from(table).select(column, { count: 'exact', head: true }).eq(ownerColumn, userKey);
  // Every Quest and blog row they own (drafts too): what the deletion removes.
  const [quests, blogs, followers] = await Promise.all([
    count('trips', 'key', 'owner_key'),
    count('blogs', 'key', 'owner_key'),
    count('follows', 'follower_key', 'followee_key'),
  ]);
  return {
    questCount: quests.error ? null : quests.count,
    blogCount: blogs.error ? null : blogs.count,
    followerCount: followers.error ? null : followers.count,
    signedUpAt: authUser.data.user?.created_at ?? null,
  };
}

/**
 * Marker, files, data, auth user, caches, then analytics: account_deleted and erasure (spec
 * analytics-v2 §5.2). Throws if files or data couldn't be removed (the person can try again; the
 * marker lets the daily job finish). `refresh` is updateTag in a server action and revalidateTag
 * elsewhere. Returns the analytics erasure result for the daily job's log.
 */
export async function deleteAccount(userKey: string, refresh: (tag: string) => void): Promise<ErasureResult> {
  const admin = createAdminSupabase();
  const marked = await admin.rpc('mark_account_deleted', { p_user_key: userKey });
  if (marked.error) throw new Error('Could not start account deletion');

  const counts = await countsBeforeDeletion(admin, userKey);
  await deleteUserFiles(admin, userKey);

  const { data, error } = await admin.rpc('delete_account_data', { p_user_key: userKey });
  if (error) throw new Error('Could not delete account data');
  const result = ResultSchema.parse(data);

  for (let attempt = 1; attempt <= AUTH_DELETE_ATTEMPTS; attempt++) {
    const { error: authError } = await admin.auth.admin.deleteUser(userKey);
    // Already gone counts as done (a repeat run).
    if (!authError || authError.status === 404) break;
    if (attempt === AUTH_DELETE_ATTEMPTS) console.error('Auth user delete failed; the daily job retries');
  }

  for (const tag of tagsToRefresh(userKey, result)) refresh(tag);

  // Only after the data is gone, and awaited rather than deferred to after() (spec §5.2). It has its
  // own deleted_ distinct id and no device ids or user_info (serverPayload), so erasure keeps it.
  if (counts) await trackServer('account_deleted', userKey, accountDeletedProperties(counts, new Date()));
  return eraseAnalytics(userKey);
}

/** True when this person's account is being deleted (sign-in must finish it, not let them in). */
export async function isAccountBeingDeleted(userKey: string): Promise<boolean> {
  const { data, error } = await createAdminSupabase()
    .from('deleted_accounts')
    .select('key')
    .eq('key', userKey)
    .maybeSingle();
  if (error) throw new Error('Could not check account');
  return data !== null;
}

/** Accounts deleted in the last 30 days, whose analytics the daily job erases again (spec §5.2). */
export async function listRecentDeletions(now: Date): Promise<string[]> {
  const { data, error } = await createAdminSupabase()
    .from('deleted_accounts')
    .select('key')
    .gte('saved_at', erasureWindowStart(now).toISOString())
    .order('saved_at');
  if (error) throw new Error('Could not list recent deletions');
  return z
    .array(z.object({ key: z.uuid() }))
    .parse(data)
    .map((row) => row.key);
}

/** Accounts whose deletion stopped halfway, for the daily job. */
export async function listPendingDeletions(): Promise<string[]> {
  const { data, error } = await createAdminSupabase().rpc('list_pending_deletions');
  if (error) throw new Error('Could not list pending deletions');
  return z.array(z.uuid()).parse(data);
}
