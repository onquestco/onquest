import 'server-only';
import { createSign } from 'node:crypto';

// Analytics erasure on account deletion (docs/specs/analytics-v2.md §5.2, decision 0004 §6).
// PostHog: the person and their events. BigQuery: the person's rows and their devices' signed-out
// rows, plus key-only markers the views anti-join. Runs from deleteAccount() and again from the
// daily cron for 30 days. Inert until its env vars are set; never throws; logs no personal data.
// Manual fallback and proofs: docs/runbooks/analytics-erasure.md.

export type ErasureStatus = 'done' | 'skipped' | 'failed';
export type ErasureResult = { posthog: ErasureStatus; bigquery: ErasureStatus };

export const ERASURE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 20_000;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const BIGQUERY_SCOPE = 'https://www.googleapis.com/auth/bigquery';
const USER_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Env = Record<string, string | undefined>;
type Deps = { fetch: typeof fetch; env: Env; now: () => Date };

export type PostHogConfig = { host: string; projectId: string; apiKey: string };
export type BigQueryConfig = {
  projectId: string;
  dataset: string;
  location: string;
  clientEmail: string;
  privateKey: string;
  privateKeyId: string | null;
};

/** Start of the cron's re-run window: deletions saved at or after this are erased again. */
export function erasureWindowStart(now: Date): Date {
  return new Date(now.getTime() - ERASURE_DAYS * DAY_MS);
}

/** Both stores confirmed. Anything else is counted in the cron's "Analytics erasure pending". */
export function erasureComplete(result: ErasureResult): boolean {
  return result.posthog === 'done' && result.bigquery === 'done';
}

// Values are checked because they end up in URLs and SQL identifiers.
const nonEmpty = (value: string | undefined) => value?.trim() || undefined;

export function postHogConfig(env: Env): PostHogConfig | 'unset' | 'invalid' {
  const host = nonEmpty(env.POSTHOG_API_HOST)?.toLowerCase();
  const projectId = nonEmpty(env.POSTHOG_PROJECT_ID);
  const apiKey = nonEmpty(env.POSTHOG_PERSONAL_API_KEY);
  if (!host || !projectId || !apiKey) return 'unset';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || !/^\d{1,12}$/.test(projectId)) return 'invalid';
  return { host, projectId, apiKey };
}

export function bigQueryConfig(env: Env): BigQueryConfig | 'unset' | 'invalid' {
  const encodedKey = nonEmpty(env.BIGQUERY_ERASER_KEY);
  const dataset = nonEmpty(env.BIGQUERY_DATASET);
  const location = nonEmpty(env.BIGQUERY_LOCATION);
  if (!encodedKey || !dataset || !location) return 'unset';
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf8'));
  } catch {
    return 'invalid';
  }
  if (typeof parsed !== 'object' || parsed === null) return 'invalid';
  const key = parsed as Record<string, unknown>;
  const { project_id: projectId, client_email: clientEmail, private_key: privateKey } = key;
  if (
    typeof projectId !== 'string' ||
    !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) ||
    typeof clientEmail !== 'string' ||
    typeof privateKey !== 'string' ||
    !/^[A-Za-z0-9_]{1,1024}$/.test(dataset) ||
    !/^[A-Za-z0-9-]{2,40}$/.test(location)
  )
    return 'invalid';
  const privateKeyId = typeof key.private_key_id === 'string' ? key.private_key_id : null;
  return { projectId, dataset, location, clientEmail, privateKey, privateKeyId };
}

/** PostHog: delete the person found by the user key (and the anon ids merged into it); queue their events. */
export function postHogDeleteRequest(config: PostHogConfig, userKey: string) {
  return {
    url: `https://${config.host}/api/projects/${config.projectId}/persons/bulk_delete/`,
    method: 'POST',
    headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ distinct_ids: [userKey], delete_events: true }),
  };
}

/**
 * The same script on the first run and every re-run (spec §5.2). @key is a query parameter; only
 * the checked project and dataset names are written into the text.
 */
export function bigQueryErasureScript(projectId: string, dataset: string): string {
  const table = (name: string) => `\`${projectId}.${dataset}.${name}\``;
  return `-- Remember the person (key only) and their device ids (random ids, not personal), so re-runs
-- still find device rows that arrive late, after the rows linking them to the key are gone.
INSERT INTO ${table('deleted_users')} (user_id, deleted_at) SELECT @key, CURRENT_TIMESTAMP()
  FROM UNNEST([1]) WHERE NOT EXISTS (SELECT 1 FROM ${table('deleted_users')} WHERE user_id = @key);
INSERT INTO ${table('deleted_devices')} (anon_id, user_id, deleted_at)
  SELECT DISTINCT JSON_VALUE(properties, '$.anon_id'), @key, CURRENT_TIMESTAMP() FROM ${table('events')}
  WHERE (distinct_id = @key OR JSON_VALUE(properties, '$.user_id') = @key)
    AND JSON_VALUE(properties, '$.anon_id') IS NOT NULL
    AND JSON_VALUE(properties, '$.anon_id') NOT IN
      (SELECT anon_id FROM ${table('deleted_devices')} WHERE user_id = @key);
DELETE FROM ${table('events')}
WHERE event != 'account_deleted' AND (
  distinct_id = @key OR JSON_VALUE(properties, '$.user_id') = @key
  OR (JSON_VALUE(properties, '$.anon_id') IN
        (SELECT anon_id FROM ${table('deleted_devices')} WHERE user_id = @key)
      -- Only signed-out rows or this person's own: never another person's signed-in rows on a
      -- shared device (their distinct_id is their own key, so it can't match @key above).
      AND (JSON_VALUE(properties, '$.user_id') IS NULL OR JSON_VALUE(properties, '$.user_id') = @key)
      AND (distinct_id = @key OR STARTS_WITH(distinct_id, 'anon_'))));`;
}

export function bigQueryRequest(config: BigQueryConfig, accessToken: string, userKey: string) {
  return {
    url: `https://bigquery.googleapis.com/bigquery/v2/projects/${config.projectId}/queries`,
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      query: bigQueryErasureScript(config.projectId, config.dataset),
      useLegacySql: false,
      location: config.location,
      parameterMode: 'NAMED',
      queryParameters: [{ name: 'key', parameterType: { type: 'STRING' }, parameterValue: { value: userKey } }],
      timeoutMs: QUERY_TIMEOUT_MS,
      maxResults: 0,
    }),
  };
}

const base64Url = (text: string) => Buffer.from(text).toString('base64url');

/** A signed service-account JWT, exchanged for an access token (node:crypto, no dependency). */
export function serviceAccountAssertion(config: BigQueryConfig, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', ...(config.privateKeyId ? { kid: config.privateKeyId } : {}) };
  const claims = {
    iss: config.clientEmail,
    scope: BIGQUERY_SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(config.privateKey, 'base64url');
  return `${unsigned}.${signature}`;
}

/** Logs the error class or HTTP status only: never a key, a body or a message that could hold one. */
function failed(store: 'posthog' | 'bigquery', reason: string): 'failed' {
  console.error(`Analytics erasure failed (${store}):`, reason);
  return 'failed';
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.name : 'unknown');

async function erasePostHog(userKey: string, deps: Deps): Promise<ErasureStatus> {
  const config = postHogConfig(deps.env);
  if (config === 'unset') return 'skipped';
  if (config === 'invalid') return failed('posthog', 'invalid config');
  const { url, ...init } = postHogDeleteRequest(config, userKey);
  const response = await deps.fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  // 404: no such person (never identified, or already deleted by an earlier run).
  if (response.ok || response.status === 404) return 'done';
  return failed('posthog', `HTTP ${response.status}`);
}

async function eraseBigQuery(userKey: string, deps: Deps): Promise<ErasureStatus> {
  const config = bigQueryConfig(deps.env);
  if (config === 'unset') return 'skipped';
  if (config === 'invalid') return failed('bigquery', 'invalid config');
  const timeout = () => AbortSignal.timeout(REQUEST_TIMEOUT_MS + QUERY_TIMEOUT_MS);

  const tokenResponse = await deps.fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: serviceAccountAssertion(config, deps.now()),
    }).toString(),
    signal: timeout(),
  });
  if (!tokenResponse.ok) return failed('bigquery', `token HTTP ${tokenResponse.status}`);
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof accessToken !== 'string') return failed('bigquery', 'no token');

  const { url, ...init } = bigQueryRequest(config, accessToken, userKey);
  const queryResponse = await deps.fetch(url, { ...init, signal: timeout() });
  if (!queryResponse.ok) return failed('bigquery', `query HTTP ${queryResponse.status}`);
  const query = (await queryResponse.json()) as { jobComplete?: boolean; jobReference?: { jobId?: string } };
  if (query.jobComplete) return 'done';

  // Still running: wait once more. If it's still not confirmed, tomorrow's run repeats it.
  const jobId = query.jobReference?.jobId;
  if (!jobId) return failed('bigquery', 'no job id');
  const pollUrl = new URL(`${url}/${encodeURIComponent(jobId)}`);
  pollUrl.search = new URLSearchParams({
    location: config.location,
    timeoutMs: String(QUERY_TIMEOUT_MS),
    maxResults: '0',
  }).toString();
  const poll = await deps.fetch(pollUrl, { headers: { authorization: `Bearer ${accessToken}` }, signal: timeout() });
  if (!poll.ok) return failed('bigquery', `poll HTTP ${poll.status}`);
  const polled = (await poll.json()) as { jobComplete?: boolean };
  return polled.jobComplete ? 'done' : failed('bigquery', 'not finished');
}

/** Best effort and safe to repeat. Never throws, so it can never fail an account deletion. */
export async function eraseAnalytics(
  userKey: string,
  deps: Deps = { fetch: (...args) => fetch(...args), env: process.env, now: () => new Date() },
): Promise<ErasureResult> {
  if (!USER_KEY.test(userKey))
    return { posthog: failed('posthog', 'bad key'), bigquery: failed('bigquery', 'bad key') };
  const guarded = (store: 'posthog' | 'bigquery', run: () => Promise<ErasureStatus>) =>
    run().catch((error: unknown) => failed(store, reasonOf(error)));
  const [posthog, bigquery] = await Promise.all([
    guarded('posthog', () => erasePostHog(userKey, deps)),
    guarded('bigquery', () => eraseBigQuery(userKey, deps)),
  ]);
  return { posthog, bigquery };
}
