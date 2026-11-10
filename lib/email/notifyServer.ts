import 'server-only';
import { absoluteUrl } from '../site';
import { createAdminSupabase } from '../supabase/admin';
import type { EmailKind } from './links';
import { notifyByEmail, type NotifyDeps } from './notify';
import { sendWithResend } from './resend';

// Wires notifyByEmail to Supabase (service role: auth.users and other people's profiles aren't
// readable otherwise) and Resend. Called inside after(), so it never slows or fails an action.

const DEFAULT_DAILY_BUDGET = 70; // of Resend's free 100 a day, so sign-in links always fit
let warnedDay = '';

function serverDeps(): NotifyDeps {
  const admin = createAdminSupabase();
  const budget = Number(process.env.NOTIFY_EMAIL_DAILY_BUDGET) || DEFAULT_DAILY_BUDGET;
  return {
    async recipient(key) {
      const [{ data: auth }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(key),
        admin.from('profiles').select('settings').eq('key', key).maybeSingle(),
      ]);
      const email = auth?.user?.email;
      return email && profile
        ? { email, settings: (profile.settings ?? {}) as Record<string, unknown> }
        : null;
    },
    async quest(tripKey) {
      const { data } = await admin
        .from('trips')
        .select('title, slug, owner:profiles!trips_owner_key_fkey(handle)')
        .eq('key', tripKey)
        .maybeSingle();
      const owner = data?.owner as { handle: string } | { handle: string }[] | null | undefined;
      const handle = Array.isArray(owner) ? owner[0]?.handle : owner?.handle;
      return data && handle
        ? { title: data.title ?? 'your Quest', url: absoluteUrl(`/@${handle}/${data.slug}`) }
        : null;
    },
    async person(key) {
      const { data } = await admin.from('profiles').select('handle, name').eq('key', key).maybeSingle();
      return data ? { name: data.name ?? data.handle, url: absoluteUrl(`/@${data.handle}`) } : null;
    },
    async claimBudget(kind) {
      const { data, error } = await admin.rpc('claim_email_budget', { p_kind: kind, p_limit: budget });
      return !error && data === true;
    },
    overBudget() {
      // Once a day is enough to act on: upgrade Resend at the first one (spec B §3.5).
      const day = new Date().toISOString().slice(0, 10);
      if (warnedDay === day) return;
      warnedDay = day;
      console.warn('Notification email budget reached for today');
    },
    send: (email) => sendWithResend(email),
  };
}

/** Emails a Quest's owner about a like or comment (never about their own). */
export async function notifyQuestOwner(event: {
  kind: Extract<EmailKind, 'like' | 'comment'>;
  tripKey: string;
  actorKey: string;
  commentBody?: string;
}) {
  const admin = createAdminSupabase();
  const { data } = await admin.from('trips').select('owner_key').eq('key', event.tripKey).maybeSingle();
  if (!data || data.owner_key === event.actorKey) return;
  const outcome = await notifyByEmail({ ...event, recipientKey: data.owner_key as string }, serverDeps());
  if (outcome === 'failed') console.error('Notification email failed'); // no user text, no address
}
