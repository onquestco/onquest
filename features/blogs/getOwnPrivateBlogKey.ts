import { HANDLE_PATTERN } from '@/lib/handles';
import { createServerSupabase } from '@/lib/supabase/server';
import { SLUG_PATTERN } from './getBlog';

/**
 * The key of the signed-in person's own private blog at this URL, or null ("Open your blog").
 * Row level security only returns the person's own blogs, so nobody else can learn a private
 * blog's key this way.
 */
export async function getOwnPrivateBlogKey(rawHandle: string, rawSlug: string): Promise<string | null> {
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
  const { data: blog } = await supabase
    .from('blogs')
    .select('key')
    .eq('owner_key', user.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'private')
    .maybeSingle();
  return blog?.key ?? null;
}
