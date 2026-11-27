import type { NextRequest } from 'next/server';
import { analyticsEnv } from '@/lib/analytics/common';
import { handleIngest, MergeMemory } from '@/lib/analytics/ingestEnrich';
import { buildUserInfo, sessionUser, type SessionUser } from '@/lib/analytics/userInfo';

// Browser analytics to PostHog, re-keyed from the verified session and enriched on our server
// (lib/analytics/ingestEnrich.ts, docs/specs/analytics-v2.md §3.2).
const merged = new MergeMemory();

async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // One lookup per request (bounded 60 s cache in userInfo.ts), shared by identity and user_info.
  let session: SessionUser | null = null;
  return handleIngest(request, (await params).path, {
    apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.POSTHOG_HOST ?? 'us.i.posthog.com',
    env: analyticsEnv(process.env.VERCEL_ENV),
    merged,
    sessionUserKey: async () => {
      session = await sessionUser(request.cookies.getAll());
      return session?.userKey ?? null;
    },
    userInfo: (userKey) => buildUserInfo(session, userKey, request.headers),
    send: fetch,
    now: Date.now,
  });
}

export const GET = forward;
export const POST = forward;
