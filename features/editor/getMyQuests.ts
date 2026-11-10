import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { photoUrls } from '@/lib/storage';
import { createServerSupabase } from '@/lib/supabase/server';
import type { QuestCard } from '@/lib/trip/cards';
import { loadOwnTrips } from './questRows';

const UNTITLED = 'Untitled Quest';

/** Every Quest the signed-in person has made, drafts included, newest first. Title and cover from the draft. */
export async function getMyQuests(): Promise<QuestCard[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const [own, profile] = await Promise.all([
    loadOwnTrips(await createServerSupabase()),
    getMyProfile(user.id),
  ]);
  if (!profile) return [];

  return own
    .map(({ trip, draft }): QuestCard => {
      const { document } = draft;
      const coverId = document.coverPhotoId ?? document.photos[0]?.id;
      return {
        key: trip.key,
        title: document.title ?? UNTITLED,
        status: trip.status,
        visibility: trip.visibility,
        path: trip.status === 'published' ? `/@${profile.handle}/${trip.slug}` : undefined,
        coverThumb: coverId ? photoUrls(`${user.id}/${trip.key}`, coverId).thumb : undefined,
        pageCount: document.content.days.length,
        photoCount: document.photos.length,
        places: document.places.slice(0, 3).map((place) => place.name),
        likeCount: 0, // spec B and C fill these
        commentCount: 0,
        publishedAt: trip.published_at ?? undefined,
        savedAt: trip.saved_at_text,
        draftSavedAt: draft.saved_at_text,
        owner: { key: user.id, handle: profile.handle, name: profile.name ?? profile.handle },
      };
    })
    .sort((a, b) => (b.draftSavedAt ?? '').localeCompare(a.draftSavedAt ?? ''));
}
