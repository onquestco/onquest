import { toPeople } from '@/lib/social/cardRows';
import type { Person } from '@/lib/social/schema';
import { createServerSupabase } from '@/lib/supabase/server';

const PAGE_SIZE = 30;

/**
 * /@handle/followers and /@handle/following (spec C §3.7): signed in only, never cached. Each
 * person says whether the viewer follows them, for the Follow buttons.
 */
export async function getFollows(
  profileKey: string,
  kind: 'followers' | 'following',
  offset = 0,
): Promise<{ people: Person[]; nextOffset: number | null }> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_follows', {
    p_profile_key: profileKey,
    p_kind: kind,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw new Error('Could not load follows');
  const people = toPeople(data);
  const { data: followed, error: stateError } = await supabase.rpc('get_my_follow_state', {
    p_keys: people.map((person) => person.key),
  });
  if (stateError) throw new Error('Could not load follows');
  const mine = new Set((followed as string[] | null) ?? []);
  return {
    people: people.map((person) => ({ ...person, following: mine.has(person.key) })),
    nextOffset: people.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}
