import { NextResponse, type NextRequest } from 'next/server';
import { downstreamHeaders, upstreamHeaders, upstreamUrl } from '@/lib/analytics/ingestProxy';

// Analytics to PostHog without Referer, cookies or auth (lib/analytics/ingestProxy.ts).
const HOST = process.env.POSTHOG_HOST ?? 'us.i.posthog.com';

async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const url = upstreamUrl(HOST, (await params).path, request.nextUrl.search);
  if (!url) return new NextResponse(null, { status: 404 });
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers: upstreamHeaders(request.headers),
      body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: downstreamHeaders(upstream.headers),
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
