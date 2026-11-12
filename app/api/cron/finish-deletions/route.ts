import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { deleteAccount, listPendingDeletions } from '@/features/account/accountDeletion';

// Daily (vercel.json): finishes account deletions that stopped halfway (spec C §3.9). Vercel sends
// Authorization: Bearer $CRON_SECRET; anything else is refused.

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

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const pending = await listPendingDeletions();
  let finished = 0;
  for (const userKey of pending) {
    try {
      await deleteAccount(userKey, (tag) => revalidateTag(tag, 'max'));
      finished += 1;
    } catch (error) {
      // Error name only: never the key's data. Retried tomorrow.
      console.error('Finishing a deletion failed:', error instanceof Error ? error.name : 'unknown');
    }
  }
  // Anything left fails again tomorrow; two failed days (spec: 48 h) need a human, via this log alert.
  if (finished < pending.length)
    console.error(`Account deletions still pending: ${pending.length - finished}`);
  return NextResponse.json({ pending: pending.length, finished });
}
