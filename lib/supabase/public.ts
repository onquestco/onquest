import { createClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './env';

/** Supabase as a logged-out visitor. Reads no cookies, so it's safe inside cached public pages. */
export function createPublicSupabase() {
  return createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
