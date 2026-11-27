import type { BlogCard } from '@/lib/blog/cards';
import { toBlogCards } from '@/lib/social/cardRows';
import { createServerSupabase } from '@/lib/supabase/server';
import { withOwnExcerpts } from './cardExcerpts';

/**
 * The signed-in person's own blogs, drafts included, newest draft save first (Quests tab and own
 * profile). Title, excerpt and cover are the draft's; status, link and counts the posted blog's.
 * Per person: never cached. Excerpts come from the draft bodies (cardExcerpts.ts).
 */
export async function getMyBlogs(): Promise<BlogCard[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('list_my_blogs');
  if (error) throw new Error('Could not load your blogs');
  return withOwnExcerpts(supabase, toBlogCards(data));
}
