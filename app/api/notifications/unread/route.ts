import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// The bell's badge, polled every 30 s while the tab is visible. Per person: never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ unread: 0 }, { status: 401, headers: NO_STORE });
  const { data, error } = await supabase.rpc('count_unread_notifications');
  return NextResponse.json({ unread: error ? 0 : Number(data) || 0 }, { headers: NO_STORE });
}
