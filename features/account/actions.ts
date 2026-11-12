'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { action, type ActionResult } from '@/lib/action';
import { readSignInReturn, withSignInReturn } from '@/lib/auth/next';
import { HandleSchema, isReservedHandle } from '@/lib/handles';
import { profileTag, profileUrlTag, tripSocialTag, tripUrlTag } from '@/lib/cacheTags';
import { absoluteUrl } from '@/lib/site';
import { avatarUrl } from '@/lib/storage';
import { VisibilitySchema } from '@/lib/trip/schema';
import { createServerSupabase } from '@/lib/supabase/server';
import { deleteAccount } from './accountDeletion';

// Error codes raised by public.save_profile (migration 8).
const HANDLE_TAKEN = 'OQ423';
const PROFILE_EXISTS = 'OQ409';

/** next, intent and ref from the sign-in page, checked again here: they come from the browser. */
const signInReturn = (raw: unknown) =>
  readSignInReturn(
    typeof raw === 'object' && raw !== null ? (raw as Record<string, string | undefined>) : {},
  );

// Sign-in can't use action(): it's the one step where nobody is signed in yet.
export async function signInWithEmail(rawEmail: unknown, rawReturn?: unknown): Promise<ActionResult<null>> {
  const email = z.email().safeParse(rawEmail);
  if (!email.success) return { ok: false, error: 'Please enter a valid email' };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    // The email template links to {{ .RedirectTo }}&token_hash=…&type=email (docs/runbooks/auth.md).
    options: { emailRedirectTo: absoluteUrl(withSignInReturn('/auth/confirm', signInReturn(rawReturn))) },
  });
  return error
    ? { ok: false, error: 'Could not send the email. Please try again.' }
    : { ok: true, data: null };
}

export async function signInWithGoogle(rawReturn?: unknown): Promise<ActionResult<string>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: absoluteUrl(withSignInReturn('/auth/callback', signInReturn(rawReturn))) },
  });
  return error || !data.url
    ? { ok: false, error: 'Could not start Google sign-in. Please try again.' }
    : { ok: true, data: data.url };
}

const ProfileInputSchema = z.object({
  handle: HandleSchema,
  name: z.string().trim().min(1).max(60),
});

export const setHandle = action(ProfileInputSchema, async ({ handle, name }, { db }) => {
  if (isReservedHandle(handle)) return { saved: false as const, reason: 'That handle is reserved' };

  // Creates the profile and claims the handle for good (handles are never reused).
  const { error } = await db.rpc('save_profile', { p_based_on: null, p_profile: { handle, name } });
  if (error?.code === HANDLE_TAKEN) return { saved: false as const, reason: 'That handle is taken' };
  // Already has a profile (onboarding finished in another tab): nothing left to do.
  if (error?.code === PROFILE_EXISTS) return { saved: true as const };
  if (error) throw new Error('Could not save profile');
  return { saved: true as const };
});

// Edit profile, settings, sign out and delete account (spec C §3.8, §3.9, §4.2).

const SaveProfileSchema = z.object({
  basedOn: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  handle: HandleSchema,
  bio: z.string().trim().max(150),
  homeCity: z.string().trim().max(60),
  /** A new photo's id (uploaded to {userId}/avatar/{id}/), null to remove, or 'keep'. */
  avatarPhotoId: z.union([z.uuid(), z.null(), z.literal('keep')]),
});

export const saveProfile = action(SaveProfileSchema, async (input, { user, db }) => {
  if (isReservedHandle(input.handle)) return { saved: false as const, error: 'handle_reserved' as const };
  const { data: current, error: readError } = await db
    .from('profiles')
    .select('handle, name, avatar_url')
    .eq('key', user.id)
    .maybeSingle();
  if (readError || !current) throw new Error('Could not load profile');

  const avatar =
    input.avatarPhotoId === 'keep'
      ? current.avatar_url
      : input.avatarPhotoId === null
        ? null
        : avatarUrl(user.id, input.avatarPhotoId);
  const { data, error } = await db.rpc('save_profile', {
    p_based_on: input.basedOn,
    p_profile: {
      handle: input.handle,
      name: input.name,
      bio: input.bio || null,
      home_city: input.homeCity || null,
      avatar_url: avatar,
    },
  });
  if (error?.code === HANDLE_TAKEN) return { saved: false as const, error: 'handle_taken' as const };
  if (error?.code === PROFILE_EXISTS) return { saved: false as const, error: 'conflict' as const };
  if (error) throw new Error('Could not save profile');

  const handleChanged = current.handle !== input.handle;
  const shownChanged = handleChanged || current.name !== input.name || current.avatar_url !== avatar;
  await refreshAfterProfileSave(db, user.id, [current.handle, input.handle], shownChanged);
  return { saved: true as const, savedAt: data as string, handleChanged };
});

/**
 * The profile page under its old and new handle; every Quest page under both (old ones start
 * redirecting); and, when the name, handle or photo changed, the comment lists that show them.
 */
async function refreshAfterProfileSave(
  db: Awaited<ReturnType<typeof createServerSupabase>>,
  userKey: string,
  handles: string[],
  shownChanged: boolean,
) {
  updateTag(profileTag(userKey));
  for (const handle of new Set(handles)) updateTag(profileUrlTag(handle));
  if (!shownChanged) return;
  const [{ data: trips }, { data: commented }] = await Promise.all([
    db.from('trips').select('slug').eq('owner_key', userKey).not('published_at', 'is', null),
    db.rpc('list_my_comment_trip_keys'),
  ]);
  for (const { slug } of (trips ?? []) as { slug: string }[]) {
    for (const handle of new Set(handles)) updateTag(tripUrlTag(handle, slug));
  }
  for (const tripKey of (commented as string[] | null) ?? []) updateTag(tripSocialTag(tripKey));
}

/** Live availability under the username field. */
export const checkHandle = action(
  z.object({ handle: z.string().trim().toLowerCase() }),
  async ({ handle }, { db }) => {
    if (!HandleSchema.safeParse(handle).success || isReservedHandle(handle)) return { available: false };
    const { data, error } = await db.rpc('is_handle_available', { p_handle: handle });
    if (error) throw new Error('Could not check username');
    return { available: data === true };
  },
);

// Only what changed, with no defaults filled in: anything sent is merged into the stored settings.
const SettingsChangeSchema = z
  .object({
    emailOnLike: z.boolean(),
    emailOnComment: z.boolean(),
    emailOnFollow: z.boolean(),
    defaultVisibility: VisibilitySchema,
    showPlaces: z.boolean(),
  })
  .partial()
  .strict();

/** One settings switch (each is saved at once, one after another, on the latest savedAt). */
export const saveSettings = action(
  z.object({ basedOn: z.string().min(1), settings: SettingsChangeSchema }),
  async ({ basedOn, settings }, { user, db }) => {
    const { data, error } = await db.rpc('save_profile_settings', {
      p_based_on: basedOn,
      p_settings: settings,
    });
    if (error?.code === 'OQ409') return { saved: false as const, error: 'conflict' as const };
    if (error) throw new Error('Could not save settings');
    // "Show places on my profile" changes the public profile.
    if (settings.showPlaces !== undefined) updateTag(profileTag(user.id));
    return { saved: true as const, savedAt: data as string };
  },
);

export const signOut = action(z.object({}), async (_input, { db }) => {
  await db.auth.signOut();
  return null;
});

/** Settings → Delete account, after typing DELETE (M26). */
export const deleteMyAccount = action(
  z.object({ confirm: z.literal('DELETE') }),
  async (_input, { user, db }) => {
    await deleteAccount(user.id, updateTag);
    await db.auth.signOut();
    return { deleted: true as const };
  },
);
