import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { deleteAccount, listPendingDeletions, listRecentDeletions } from '@/features/account/accountDeletion';
import { eraseAnalytics, erasureComplete } from '@/lib/analytics/erasure';

// Daily (vercel.json): finishes account deletions that stopped halfway (spec C §3.9), then erases
// the analytics of every account deleted in the last 30 days again (analytics-v2 §5.2). Vercel
// sends Authorization: Bearer $CRON_SECRET; anything else is refused.

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return (
    Boolean(secret) &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}

const errorName = (error: unknown) => (error instanceof Error ? error.name : 'unknown');

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const pending = await listPendingDeletions();
  let finished = 0;
  let erasurePending = 0;
  const erasedNow = new Set<string>();
  for (const userKey of pending) {
    try {
      const erasure = await deleteAccount(userKey, (tag) => revalidateTag(tag, 'max'));
      erasedNow.add(userKey);
      if (!erasureComplete(erasure)) erasurePending += 1;
      finished += 1;
    } catch (error) {
      // Error name only: never the key's data. Retried tomorrow.
      console.error('Finishing a deletion failed:', errorName(error));
    }
  }
  // Anything left fails again tomorrow; two failed days (spec: 48 h) need a human, via this log alert.
  if (finished < pending.length)
    console.error(`Account deletions still pending: ${pending.length - finished}`);

  // Re-runs catch rows that reach PostHog's export late or are backfilled, and retry failures.
  // Skipped (env unset) and failed both count as pending: docs/runbooks/analytics-erasure.md.
  let recent: string[] = [];
  try {
    recent = await listRecentDeletions(new Date());
  } catch (error) {
    console.error('Listing recent deletions failed:', errorName(error));
  }
  for (const userKey of recent) {
    if (erasedNow.has(userKey)) continue;
    if (!erasureComplete(await eraseAnalytics(userKey))) erasurePending += 1;
  }
  if (erasurePending > 0) console.error(`Analytics erasure pending: ${erasurePending}`);

  return NextResponse.json({ pending: pending.length, finished, erasurePending });
}
