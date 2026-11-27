import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/features/account/getCurrentUser';
import { createServerSupabase } from '@/lib/supabase/server';

// For create_quest_click.is_first_quest_flg on screens that don't list the person's Quests (the
// Create menu, "Make your own Quest"). An owner-only read through RLS; undefined instead of an
// error, so the event leaves the flag out rather than guessing (analytics v2 §4.2).

/** Whether the owner has published a Quest; undefined if it couldn't be read. */
export async function hasPublishedQuest(db: SupabaseClient, ownerKey: string): Promise<boolean | undefined> {
  try {
    const { count, error } = await db
      .from('trips')
      .select('key', { count: 'exact', head: true })
      .eq('owner_key', ownerKey)
      .eq('status', 'published');
    return error || count === null ? undefined : count > 0;
  } catch {
    return undefined;
  }
}

/** The same for the signed-in person, for a page's loader; undefined when signed out. */
export async function getHasPublishedQuest(): Promise<boolean | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;
  return hasPublishedQuest(await createServerSupabase(), user.id);
}
