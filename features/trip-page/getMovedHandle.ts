import { HANDLE_PATTERN } from '@/lib/handles';
import { createPublicSupabase } from '@/lib/supabase/public';

/**
 * The current handle of whoever once had this one, or null (spec C §3.7). Old shared links
 * (/@old/slug) redirect permanently; handles are never reused, so nobody can take them over.
 */
export async function getMovedHandle(rawHandle: string): Promise<string | null> {
  const handle = rawHandle.toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) return null;
  const { data, error } = await createPublicSupabase().rpc('resolve_handle', { p_handle: handle });
  if (error) throw new Error('Could not resolve handle');
  return typeof data === 'string' && data !== handle ? data : null;
}
