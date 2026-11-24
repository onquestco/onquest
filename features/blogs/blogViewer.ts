import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { toQuestCards } from '@/lib/social/cardRows';
import type { BlogViewer } from '@/lib/social/schema';
import { VisibilitySchema } from '@/lib/trip/schema';

// get_my_blog_state (migration 17) → BlogViewer, for /api/blogs/[key]/me. The owner-only fields
// come back only when the database says the viewer is the writer.

const StateSchema = z.object({
  liked: z.boolean(),
  is_owner: z.boolean(),
  saved_at: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  linked_quest_hidden: z.boolean().optional(),
  own_linked_quest: z.unknown().optional(),
});

/** The viewer of one blog; null when signed out, 'invalid' for a key that isn't a uuid. */
export async function toViewer(
  supabase: SupabaseClient,
  user: User | null,
  rawKey: string,
  rawOwner: string | null,
): Promise<BlogViewer | null | 'invalid'> {
  const key = z.uuid().safeParse(rawKey);
  if (!key.success) return 'invalid';
  if (!user) return null;

  const signedInOnly: BlogViewer = {
    signedIn: true,
    liked: false,
    isOwner: false,
    followingOwner: false,
    linkedQuestHidden: false,
  };
  const { data, error } = await supabase.rpc('get_my_blog_state', { p_blog_key: key.data });
  const state = StateSchema.safeParse(data);
  if (error || !state.success) return signedInOnly;

  const owner = z.uuid().safeParse(rawOwner);
  let followingOwner = false;
  if (owner.success && !state.data.is_owner) {
    const follows = await supabase.rpc('get_my_follow_state', { p_keys: [owner.data] });
    followingOwner = Array.isArray(follows.data) && follows.data.includes(owner.data);
  }
  const viewer: BlogViewer = {
    ...signedInOnly,
    liked: state.data.liked,
    isOwner: state.data.is_owner,
    followingOwner,
  };
  if (!state.data.is_owner) return viewer;
  return {
    ...viewer,
    savedAt: state.data.saved_at,
    visibility: state.data.visibility,
    linkedQuestHidden: state.data.linked_quest_hidden ?? false,
    ownLinkedQuest: state.data.own_linked_quest ? toQuestCards([state.data.own_linked_quest])[0] : undefined,
  };
}
