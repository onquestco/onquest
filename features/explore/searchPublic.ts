import { toPeople, toQuestCards } from '@/lib/social/cardRows';
import type { SearchResults } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 60;

/** Search (spec C §3.5): public Quests and people. The text is never logged or tracked. */
export async function searchPublic(text: string): Promise<SearchResults> {
  const query = text.trim();
  if (query.length < SEARCH_MIN || query.length > SEARCH_MAX) return { quests: [], people: [], guides: [] };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('search_public', { p_query: query, p_limit: 10 });
  if (error) throw new Error('Search failed');
  const result = data as { quests: unknown; people: unknown };
  // Stories (guides) join with C-06.
  return { quests: toQuestCards(result.quests), people: toPeople(result.people), guides: [] };
}
