import 'server-only';
import { revalidateTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteAccount, isAccountBeingDeleted } from './accountDeletion';

/**
 * Someone whose account deletion stopped halfway signs in before the daily job ran: finish it and
 * sign them out, so they never land in an empty onboarding (spec C §3.9 step 4). Returns where
 * to send them, or null to carry on signing in.
 */
export async function finishDeletionOnSignIn(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAccountBeingDeleted(user.id))) return null;
  await deleteAccount(user.id, (tag) => revalidateTag(tag, 'max'));
  await supabase.auth.signOut();
  return '/?deleted=1';
}
