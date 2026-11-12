import { HANDLE_PATTERN } from '@/lib/handles';
import { createServerSupabase } from '@/lib/supabase/server';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The key of the signed-in person's own private Quest at this URL, or null. Row level security
 * only returns the person's own trips, so nobody else can learn a private Quest's key this way.
 */
export async function getOwnPrivateQuestKey(rawHandle: string, rawSlug: string): Promise<string | null> {
  const handle = rawHandle.toLowerCase();
  const slug = rawSlug.toLowerCase();
  if (!HANDLE_PATTERN.test(handle) || !SLUG_PATTERN.test(slug)) return null;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('handle').eq('key', user.id).maybeSingle();
  if (profile?.handle !== handle) return null;
  const { data: trip } = await supabase
    .from('trips')
    .select('key')
    .eq('owner_key', user.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'private')
    .maybeSingle();
  return trip?.key ?? null;
}
