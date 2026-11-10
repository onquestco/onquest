'use server';

import { z } from 'zod';
import { action, type ActionResult } from '@/lib/action';
import { readSignInReturn, withSignInReturn } from '@/lib/auth/next';
import { HandleSchema, isReservedHandle } from '@/lib/handles';
import { absoluteUrl } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

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
