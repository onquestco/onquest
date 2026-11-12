import { NextResponse, type NextRequest } from 'next/server';
import { color } from '@/design-system/tokens';
import { verifyUnsubscribe, type EmailKind } from '@/lib/email/links';
import { escapeHtml } from '@/lib/email/escape';
import { createAdminSupabase } from '@/lib/supabase/admin';

// "Stop these emails" without signing in (spec B §3.5, S2). GET shows a one-button page, so mail
// scanners that open links don't unsubscribe anyone; POST (the button, or a mail app's one-click
// List-Unsubscribe-Post) turns that one switch off.

const SWITCH: Record<EmailKind, string> = {
  like: 'emailOnLike',
  comment: 'emailOnComment',
  follow: 'emailOnFollow',
};
const WHAT: Record<EmailKind, string> = { like: 'likes', comment: 'comments', follow: 'new followers' };
const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};

const page = (body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OnQuest emails</title></head>` +
  `<body style="max-width:28rem;margin:4rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`;

const invalid = () =>
  new NextResponse(page('<p>This link doesn’t work. You can change emails in Settings on OnQuest.</p>'), {
    status: 400,
    headers: HEADERS,
  });

export async function GET(request: NextRequest) {
  const target = verifyUnsubscribe(request.nextUrl.searchParams);
  if (!target) return invalid();
  const action = escapeHtml(`${request.nextUrl.pathname}${request.nextUrl.search}`);
  return new NextResponse(
    page(
      `<p>Stop emails about ${WHAT[target.kind]} on your Quests? You’ll still see them in the bell on OnQuest.</p>` +
        `<form method="post" action="${action}"><button type="submit" style="padding:.75rem 1.5rem;border-radius:999px;border:0;background:${color('brand-strong')};color:${color('on-brand')};font-weight:600">Stop these emails</button></form>`,
    ),
    { headers: HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const target = verifyUnsubscribe(request.nextUrl.searchParams);
  if (!target) return invalid();
  const { error } = await createAdminSupabase().rpc('save_profile_settings_as_admin', {
    p_key: target.userKey,
    p_settings: { [SWITCH[target.kind]]: false },
  });
  if (error) {
    return new NextResponse(page('<p>Something went wrong. Please try again.</p>'), {
      status: 500,
      headers: HEADERS,
    });
  }
  return new NextResponse(
    page(
      `<p>Done. You won’t get emails about ${WHAT[target.kind]} any more. Turn them back on in Settings.</p>`,
    ),
    { headers: HEADERS },
  );
}
