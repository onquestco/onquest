import { getCurrentUser } from '@/features/account/getCurrentUser';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Whether the signed-in person may start a blog (spec §3.9: the flag gates writing only).
 * Signed out it is false without asking the database: has_feature_access is for signed-in users.
 * A failed check counts as no access, so the chooser falls back to "Releasing soon".
 */
export async function hasBlogAccess(): Promise<boolean> {
  if (!(await getCurrentUser())) return false;
  const db = await createServerSupabase();
  const { data, error } = await db.rpc('has_feature_access', { p_feature: 'blogs' });
  if (error) {
    console.error('Feature access check failed:', error.code ?? 'unknown');
    return false;
  }
  return data === true;
}
