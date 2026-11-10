import 'server-only';
import { z } from 'zod';
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
});

const AUTH_DELETE_ATTEMPTS = 3;

/**
 * Marker, files, data, auth user, caches. Throws if files or data couldn't be removed (the person
 * can try again; the marker lets the daily job finish). `refresh` is updateTag in a server action
 * and revalidateTag elsewhere.
 */
export async function deleteAccount(userKey: string, refresh: (tag: string) => void): Promise<void> {
  const admin = createAdminSupabase();
  const marked = await admin.rpc('mark_account_deleted', { p_user_key: userKey });
  if (marked.error) throw new Error('Could not start account deletion');

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

/** Accounts whose deletion stopped halfway, for the daily job. */
export async function listPendingDeletions(): Promise<string[]> {
  const { data, error } = await createAdminSupabase().rpc('list_pending_deletions');
  if (error) throw new Error('Could not list pending deletions');
  return z.array(z.uuid()).parse(data);
}
