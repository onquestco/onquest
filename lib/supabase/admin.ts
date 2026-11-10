import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './env';

/**
 * Supabase with the secret key: bypasses RLS. The only place the key is used (CLAUDE.md security
 * rules). For server-only jobs that users must not reach directly: the geocoder cache and limiter,
 * email budgets, the link preview's cover, account deletion.
 */
export function createAdminSupabase() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Missing environment variable SUPABASE_SECRET_KEY');
  return createClient(supabaseUrl(), secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
