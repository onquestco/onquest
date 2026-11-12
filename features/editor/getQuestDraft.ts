import { cache } from 'react';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { createServerSupabase } from '@/lib/supabase/server';
import { loadOwnTrip } from './questRows';

/**
 * The signed-in owner's Quest, for the editor steps, preview and "Edit Quest". Null when it isn't
 * theirs or doesn't exist (RLS hides other people's rows).
 */
export const getQuestDraft = cache(async (key: string) => {
  const user = await getCurrentUser();
  if (!user) return null;
  const [own, profile] = await Promise.all([
    loadOwnTrip(await createServerSupabase(), key),
    getMyProfile(user.id),
  ]);
  if (!own || !profile) return null;
  const { trip, draft } = own;
  return {
    key,
    draftSavedAt: draft.saved_at_text,
    tripSavedAt: trip.saved_at_text,
    status: trip.status,
    visibility: trip.visibility,
    slug: trip.status === 'published' ? trip.slug : undefined,
    seed: trip.seed,
    ownerHandle: profile.handle,
    ownerName: profile.name,
    photoFolder: `${user.id}/${key}`,
    document: draft.document,
    // Backfilled Quests don't record which draft was published: treat them as up to date.
    hasUnpublishedChanges:
      trip.status === 'published' &&
      trip.published_draft_saved_at_text !== null &&
      trip.published_draft_saved_at_text !== draft.saved_at_text,
  };
});

export type QuestDraft = NonNullable<Awaited<ReturnType<typeof getQuestDraft>>>;
