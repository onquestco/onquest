import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env';

// user_info and the verified session for analytics (docs/specs/analytics-v2.md §4.2, decision
// 0004). The only place an email may enter an event, and only for the request's own signed-in
// user. /ingest and trackServer share it.

export const UserInfoSchema = z
  .object({
    geoip: z
      .object({
        country: z.string().regex(/^[A-Z]{2}$/).nullable(),
        region: z.string().max(10).nullable(),
        city: z.string().max(80).nullable(),
      })
      .nullable(),
    username: z.string().max(20).nullable(), // profiles.handle; null before onboarding
    email_id: z.string().max(320).nullable(),
  })
  .nullable();

export type UserInfo = z.infer<typeof UserInfoSchema>;
export type SessionUser = { userKey: string; email: string | null; handle: string | null };
type HeaderReader = { get(name: string): string | null };
type CookieList = { name: string; value: string }[];

// Gate ----------------------------------------------------------------------------------------

/** ANALYTICS_USER_INFO: unset/off → never; team → only ANALYTICS_USER_INFO_TEAM_KEYS; on → everyone. */
export function userInfoAllowed(userKey: string, env: Record<string, string | undefined> = process.env): boolean {
  const gate = env.ANALYTICS_USER_INFO;
  if (gate === 'on') return true;
  if (gate !== 'team') return false;
  const team = (env.ANALYTICS_USER_INFO_TEAM_KEYS ?? '').split(',').map((key) => key.trim());
  return team.includes(userKey);
}

/** Country, region and city from Vercel's headers: never finer, never the IP. */
export function geoFrom(requestHeaders: HeaderReader): NonNullable<UserInfo>['geoip'] {
  const country = requestHeaders.get('x-vercel-ip-country')?.toUpperCase() ?? '';
  const region = requestHeaders.get('x-vercel-ip-country-region') ?? '';
  let city = '';
  try {
    city = decodeURIComponent(requestHeaders.get('x-vercel-ip-city') ?? '');
  } catch {
    city = '';
  }
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    region: /^[A-Za-z0-9-]{1,10}$/.test(region) ? region : null,
    city: city && city.length <= 80 && !/[\p{Cc}<>]/u.test(city) ? city : null,
  };
}

/** user_info for `expectedUserKey`: null unless the verified session is that user and the gate allows. */
export function buildUserInfo(
  session: SessionUser | null,
  expectedUserKey: string | null,
  requestHeaders: HeaderReader,
  env: Record<string, string | undefined> = process.env,
): UserInfo {
  if (!session || !expectedUserKey || session.userKey !== expectedUserKey) return null;
  if (!userInfoAllowed(session.userKey, env)) return null;
  const parsed = UserInfoSchema.safeParse({
    geoip: geoFrom(requestHeaders),
    username: session.handle,
    email_id: session.email,
  });
  return parsed.success ? parsed.data : null;
}

// Session -------------------------------------------------------------------------------------

/**
 * The access token in Supabase's auth cookie (sb-<ref>-auth-token, maybe in .0/.1 chunks, maybe
 * "base64-" encoded). Read directly so nothing here ever refreshes (and so rotates) a session.
 */
export function accessTokenFromCookies(cookieList: CookieList): string | null {
  const whole = cookieList.find(({ name }) => /^sb-[^.]+-auth-token$/.test(name));
  const chunks = cookieList
    .filter(({ name }) => /^sb-[^.]+-auth-token\.\d+$/.test(name))
    .sort((a, b) => Number(a.name.split('.').pop()) - Number(b.name.split('.').pop()));
  const parts = whole ? [whole] : chunks;
  if (parts.length === 0) return null;
  let raw = parts.map(({ value }) => value).join('');
  try {
    if (raw.startsWith('base64-')) raw = Buffer.from(raw.slice('base64-'.length), 'base64url').toString('utf8');
    const session: unknown = JSON.parse(raw);
    const token =
      session && typeof session === 'object' && 'access_token' in session ? session.access_token : undefined;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

const CACHE_MAX = 1000;
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; user: SessionUser | null }>();

/** Bounded LRU (spec D12): 1,000 entries, 60 s, keyed by SHA-256 of the access token. */
export async function cachedSession(
  token: string,
  lookup: (token: string) => Promise<SessionUser | null>,
  now = Date.now(),
): Promise<SessionUser | null> {
  const id = createHash('sha256').update(token).digest('hex');
  const hit = cache.get(id);
  cache.delete(id);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    cache.set(id, hit);
    return hit.user;
  }
  const user = await lookup(token);
  cache.set(id, { at: now, user });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return user;
}

export const sessionCacheSize = () => cache.size;

/** getUser() with the token (verified by Supabase Auth), then the handle through RLS as that user. */
async function lookupSession(token: string): Promise<SessionUser | null> {
  const supabase = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from('profiles').select('handle').eq('key', data.user.id).maybeSingle();
  return { userKey: data.user.id, email: data.user.email ?? null, handle: profile?.handle ?? null };
}

/** The request's verified user, or null (signed out, expired token, or outside a request). */
export async function sessionUser(cookieList?: CookieList): Promise<SessionUser | null> {
  try {
    const token = accessTokenFromCookies(cookieList ?? (await cookies()).getAll());
    return token ? await cachedSession(token, lookupSession) : null;
  } catch {
    return null;
  }
}

/**
 * The session's own user_info, or null. Returns null unless the request's verified session user
 * is `expectedUserKey`, so a cron job, the unsubscribe link or notification_sent can never look
 * up someone's email by key.
 */
export async function userInfoForSession(expectedUserKey: string): Promise<UserInfo> {
  try {
    return buildUserInfo(await sessionUser(), expectedUserKey, await headers());
  } catch {
    return null;
  }
}
