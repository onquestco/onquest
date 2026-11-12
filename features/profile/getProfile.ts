import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { profileTag, profileUrlTag } from '@/lib/cacheTags';
import { HANDLE_PATTERN } from '@/lib/handles';
import { photoUrls } from '@/lib/storage';
import { createPublicSupabase } from '@/lib/supabase/public';
import type { QuestCard } from '@/lib/trip/cards';

// /@handle (spec C §3.7): get_profile, cached by URL (profile-url:{handle}) and by person
// (profile:{key}); an old handle answers with where it moved to.

const ProfileRowSchema = z.object({
  profile: z.object({
    key: z.uuid(),
    handle: z.string(),
    name: z.string().nullable(),
    bio: z.string().nullable(),
    home_city: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
  stats: z.object({
    trips: z.number(),
    places: z.number(),
    countries: z.number(),
    days: z.number(),
    followers: z.number(),
    following: z.number(),
  }),
  trips: z.array(
    z.object({
      key: z.uuid(),
      slug: z.string(),
      title: z.string().nullable(),
      cover_photo_id: z.string().nullable(),
      photo_folder: z.string(),
      page_count: z.number(),
      photo_count: z.number(),
      /** Migration 14; absent from older database code. */
      published_at: z.string().nullable().optional(),
    }),
  ),
  pins: z.array(z.object({ name: z.string(), lat: z.number(), lng: z.number(), trip_slug: z.string() })),
  places: z.array(z.string()),
});

function toProfileView(row: z.infer<typeof ProfileRowSchema>) {
  const { profile } = row;
  const name = profile.name ?? profile.handle;
  const owner = {
    key: profile.key,
    handle: profile.handle,
    name,
    avatarUrl: profile.avatar_url ?? undefined,
  };
  const quests: QuestCard[] = row.trips.map((trip) => ({
    key: trip.key,
    title: trip.title ?? 'Untitled Quest',
    status: 'published',
    visibility: 'public',
    path: `/@${profile.handle}/${trip.slug}`,
    coverThumb: trip.cover_photo_id ? photoUrls(trip.photo_folder, trip.cover_photo_id).thumb : undefined,
    pageCount: trip.page_count,
    publishedAt: trip.published_at ?? undefined,
    photoCount: trip.photo_count,
    places: [],
    likeCount: 0,
    commentCount: 0,
    savedAt: '',
    owner,
  }));
  return {
    key: profile.key,
    handle: profile.handle,
    name,
    bio: profile.bio ?? undefined,
    homeCity: profile.home_city ?? undefined,
    avatarUrl: profile.avatar_url ?? undefined,
    stats: { quests: row.stats.trips, ...row.stats },
    places: row.places,
    pins: row.pins,
    quests,
  };
}

export type ProfileView = ReturnType<typeof toProfileView>;
export type ProfileResult = { profile: ProfileView } | { movedTo: string } | null;

async function fetchProfile(handle: string): Promise<ProfileView | null> {
  const { data, error } = await createPublicSupabase().rpc('get_profile', { p_handle: handle });
  if (error) throw new Error('Could not load profile'); // kept out of the cache
  return data ? toProfileView(ProfileRowSchema.parse(data)) : null;
}

/** Whose profile this URL is (cached by URL), or where an old handle moved to. */
async function locate(handle: string): Promise<{ key: string } | { movedTo: string } | null> {
  const profile = await fetchProfile(handle);
  if (profile) return { key: profile.key };
  const moved = await createPublicSupabase().rpc('resolve_handle', { p_handle: handle });
  if (moved.error) throw new Error('Could not load profile');
  return typeof moved.data === 'string' && moved.data !== handle ? { movedTo: moved.data } : null;
}

/**
 * A profile, where an old handle moved to, or null (a real 404). Two cache entries, because the
 * person's key isn't known before the first read: the URL → person one (tag profile-url:{handle})
 * and the profile itself (tags profile:{key} and profile-url:{handle}), so a follow, an edit or a
 * handle change each refresh it.
 */
export async function getProfile(rawHandle: string): Promise<ProfileResult> {
  const handle = rawHandle.toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) return null;
  const located = await unstable_cache(() => locate(handle), ['profile-at', handle], {
    tags: [profileUrlTag(handle)],
  })();
  if (!located || 'movedTo' in located) return located;
  const profile = await unstable_cache(() => fetchProfile(handle), ['profile', located.key, handle], {
    tags: [profileTag(located.key), profileUrlTag(handle)],
  })();
  return profile ? { profile } : null;
}
