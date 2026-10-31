import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { z } from 'zod';
import { createServerSupabase } from './supabase/server';

export type ActionResult<Output> = { ok: true; data: Output } | { ok: false; error: string };

/** Wraps a server action: validates input, requires a signed-in user, and hides internal errors. */
export function action<Schema extends z.ZodType, Output>(
  schema: Schema,
  run: (input: z.output<Schema>, context: { user: User; db: SupabaseClient }) => Promise<Output>,
) {
  return async (rawInput: unknown): Promise<ActionResult<Output>> => {
    const input = schema.safeParse(rawInput);
    if (!input.success) return { ok: false, error: 'Invalid input' };

    const db = await createServerSupabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { ok: false, error: 'Not signed in' };

    try {
      return { ok: true, data: await run(input.data, { user, db }) };
    } catch (error) {
      // Only the error type: messages can contain user text, which must not reach the logs.
      console.error('Server action failed:', error instanceof Error ? error.name : 'unknown');
      return { ok: false, error: 'Something went wrong' };
    }
  };
}
