import { z } from 'zod';
import { getCurrentUser, getMyProfile } from '@/features/account/getCurrentUser';
import { photoUrls } from '@/lib/storage';
import { createServerSupabase } from '@/lib/supabase/server';
import type { QuestCard } from '@/lib/trip/cards';
import { VisibilitySchema } from '@/lib/trip/schema';

// "Link a Quest": the writer's own posted Quests as readers see them (the live row, not the
// draft), newest first. Read through RLS, so only their own.

const COLUMNS =
  'key, title, visibility, slug, cover_photo_key, photos, places, content, published_at, comments_on, saved_at_text:saved_at::text';

const RowSchema = z.object({
  key: z.uuid(),
  title: z.string().nullable(),
  visibility: VisibilitySchema,
  slug: z.string(),
  cover_photo_key: z.uuid().nullable(),
  photos: z.array(z.object({ id: z.string() })),
  places: z.array(z.object({ name: z.string() })),
  content: z.object({ days: z.array(z.unknown()) }),
  published_at: z.string().nullable(),
  comments_on: z.boolean(),
  saved_at_text: z.string(),
});

export async function getMyQuestsForLinking(): Promise<QuestCard[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await createServerSupabase();
  const [{ data, error }, profile] = await Promise.all([
    db.from('trips').select(COLUMNS).eq('status', 'published').order('published_at', { ascending: false }),
    getMyProfile(user.id),
  ]);
  if (error) throw new Error('Could not load Quests');
  if (!profile) return [];

  return z
    .array(RowSchema)
    .parse(data)
    .map((trip): QuestCard => {
      const coverId = trip.cover_photo_key ?? trip.photos[0]?.id;
      return {
        key: trip.key,
        title: trip.title ?? 'Untitled Quest',
        status: 'published',
        visibility: trip.visibility,
        path: `/@${profile.handle}/${trip.slug}`,
        coverThumb: coverId ? photoUrls(`${user.id}/${trip.key}`, coverId).thumb : undefined,
        pageCount: trip.content.days.length,
        photoCount: trip.photos.length,
        places: [...new Set(trip.places.map((place) => place.name))].slice(0, 3),
        likeCount: 0,
        commentCount: 0,
        publishedAt: trip.published_at ?? undefined,
        savedAt: trip.saved_at_text,
        commentsOn: trip.comments_on,
        owner: { key: user.id, handle: profile.handle, name: profile.name ?? profile.handle },
      };
    });
}
