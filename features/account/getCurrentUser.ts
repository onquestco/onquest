import { createServerSupabase } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The signed-in user's profile, or null if they haven't picked a handle yet. */
export async function getMyProfile(userId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('handle, name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error('Could not load profile');
  return data as { handle: string; name: string | null } | null;
}
