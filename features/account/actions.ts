'use server';

import { z } from 'zod';
import { action, type ActionResult } from '@/lib/action';
import { HandleSchema, isReservedHandle } from '@/lib/handles';
import { absoluteUrl } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

const AUTH_CALLBACK = absoluteUrl('/auth/callback');
const UNIQUE_VIOLATION = '23505'; // Postgres error code

// Sign-in can't use action(): it's the one step where nobody is signed in yet.
export async function signInWithEmail(rawEmail: unknown): Promise<ActionResult<null>> {
  const email = z.email().safeParse(rawEmail);
  if (!email.success) return { ok: false, error: 'Please enter a valid email' };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: AUTH_CALLBACK },
  });
  return error
    ? { ok: false, error: 'Could not send the email. Please try again.' }
    : { ok: true, data: null };
}

export async function signInWithGoogle(): Promise<ActionResult<string>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_CALLBACK },
  });
  return error || !data.url
    ? { ok: false, error: 'Could not start Google sign-in. Please try again.' }
    : { ok: true, data: data.url };
}

const ProfileInputSchema = z.object({
  handle: HandleSchema,
  name: z.string().trim().min(1).max(60),
});

export const setHandle = action(ProfileInputSchema, async ({ handle, name }, { user, db }) => {
  if (isReservedHandle(handle)) return { saved: false as const, reason: 'That handle is reserved' };

  // Other people's profiles are hidden by RLS, so the unique constraint is what detects a taken handle.
  const { error } = await db.from('profiles').upsert({ id: user.id, handle, name });
  if (error?.code === UNIQUE_VIOLATION) return { saved: false as const, reason: 'That handle is taken' };
  if (error) throw new Error('Could not save profile');
  return { saved: true as const };
});
