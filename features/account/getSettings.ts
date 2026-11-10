import { ProfileSettingsSchema } from '@/lib/profile/schema';
import { createServerSupabase } from '@/lib/supabase/server';

/** Settings (screen 17): the switches with their defaults, the email (from sign-in) and savedAt. */
export async function getSettings() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('handle, name, bio, home_city, avatar_url, settings, saved_at_text:saved_at::text')
    .eq('key', user.id)
    .maybeSingle();
  if (error) throw new Error('Could not load settings');
  if (!data) return null;
  return {
    email: user.email ?? '',
    handle: data.handle as string,
    name: (data.name as string | null) ?? '',
    bio: (data.bio as string | null) ?? '',
    homeCity: (data.home_city as string | null) ?? '',
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
    settings: ProfileSettingsSchema.parse(data.settings ?? {}),
    savedAt: data.saved_at_text as string,
  };
}
