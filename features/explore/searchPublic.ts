import { withPublicExcerpts } from '@/features/blogs/cardExcerpts';
import { publishedGuides, toGuideCard } from '@/features/guides/guides';
import { searchGuides } from '@/features/guides/searchGuides';
import { toBlogCards, toPeople, toQuestCards } from '@/lib/social/cardRows';
import type { SearchResults } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 60;

/** Search (spec C §3.5): public Quests, people and blogs. The text is never logged or tracked. */
export async function searchPublic(text: string): Promise<SearchResults> {
  const query = text.trim();
  if (query.length < SEARCH_MIN || query.length > SEARCH_MAX) return { quests: [], people: [], guides: [], blogs: [] };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('search_public', { p_query: query, p_limit: 10 });
  if (error) throw new Error('Search failed');
  // blogs: migration 17. Before it, search_public has no blogs key.
  const result = data as { quests: unknown; people: unknown; blogs?: unknown };
  return {
    quests: toQuestCards(result.quests),
    people: toPeople(result.people),
    guides: searchGuides(publishedGuides(), query).map(toGuideCard),
    blogs: await withPublicExcerpts(toBlogCards(result.blogs ?? [])),
  };
}
