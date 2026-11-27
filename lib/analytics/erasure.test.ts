import { PGlite } from '@electric-sql/pglite';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  bigQueryConfig,
  bigQueryErasureScript,
  bigQueryRequest,
  eraseAnalytics,
  erasureComplete,
  erasureWindowStart,
  postHogConfig,
  postHogDeleteRequest,
  serviceAccountAssertion,
} from './erasure';

// vi.mock is hoisted above the imports. erasure.ts is server-only; every network call goes
// through the fetch passed in, so nothing here leaves the machine.
vi.mock('server-only', () => ({}));

const KEY = '0f8c06e0-ff8e-4996-ada5-c17de627ae88';
const NOW = new Date('2026-11-27T02:00:00Z');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccount = {
  type: 'service_account',
  project_id: 'onquest-test',
  private_key_id: 'kid-1',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  client_email: 'analytics-eraser@onquest-test.iam.gserviceaccount.com',
};
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');
const POSTHOG_ENV = { POSTHOG_API_HOST: 'us.posthog.com', POSTHOG_PROJECT_ID: '12345', POSTHOG_PERSONAL_API_KEY: 'phx_test' };
const BIGQUERY_ENV = {
  BIGQUERY_ERASER_KEY: encode(serviceAccount),
  BIGQUERY_DATASET: 'onquest_analytics',
  BIGQUERY_LOCATION: 'US',
};

type Reply = { status?: number; body?: unknown } | Error;
/** A fetch that answers by URL and records every call. */
function fakeFetch(replies: Record<string, Reply[]>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const route = Object.keys(replies).find((prefix) => url.startsWith(prefix));
    const reply = route ? replies[route]?.shift() : undefined;
    if (!reply) throw new Error(`unexpected fetch ${url}`);
    if (reply instanceof Error) throw reply;
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status ?? 200 });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}
const deps = (env: Record<string, string>, replies: Record<string, Reply[]> = {}) => {
  const fake = fakeFetch(replies);
  return { deps: { fetch: fake.fetch, env, now: () => NOW }, calls: fake.calls };
};
const POSTHOG_URL = 'https://us.posthog.com/api/projects/12345/persons/bulk_delete/';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const QUERY_URL = 'https://bigquery.googleapis.com/bigquery/v2/projects/onquest-test/queries';

describe('config', () => {
  it('is inert until every variable is set', async () => {
    expect(postHogConfig({})).toBe('unset');
    expect(postHogConfig({ ...POSTHOG_ENV, POSTHOG_PERSONAL_API_KEY: ' ' })).toBe('unset');
    expect(bigQueryConfig({ ...BIGQUERY_ENV, BIGQUERY_LOCATION: '' })).toBe('unset');
    const { deps: unset, calls } = deps({});
    expect(await eraseAnalytics(KEY, unset)).toEqual({ posthog: 'skipped', bigquery: 'skipped' });
    expect(calls).toEqual([]);
  });

  it('rejects values that would end up in a URL or an SQL identifier', () => {
    expect(postHogConfig({ ...POSTHOG_ENV, POSTHOG_API_HOST: 'evil.com/x?' })).toBe('invalid');
    expect(postHogConfig({ ...POSTHOG_ENV, POSTHOG_PROJECT_ID: '1/../2' })).toBe('invalid');
    expect(bigQueryConfig({ ...BIGQUERY_ENV, BIGQUERY_DATASET: 'a`; DROP' })).toBe('invalid');
    expect(bigQueryConfig({ ...BIGQUERY_ENV, BIGQUERY_ERASER_KEY: 'not base64 json' })).toBe('invalid');
    expect(bigQueryConfig({ ...BIGQUERY_ENV, BIGQUERY_ERASER_KEY: encode({ ...serviceAccount, project_id: 'x`y' }) })).toBe(
      'invalid',
    );
    expect(bigQueryConfig({ ...BIGQUERY_ENV, BIGQUERY_ERASER_KEY: encode(null) })).toBe('invalid');
  });

  it('takes the project from the key, the dataset and location from env', () => {
    expect(bigQueryConfig(BIGQUERY_ENV)).toMatchObject({
      projectId: 'onquest-test',
      dataset: 'onquest_analytics',
      location: 'US',
      privateKeyId: 'kid-1',
    });
  });
});

describe('PostHog', () => {
  it('bulk-deletes the person by user key, with their events', () => {
    const config = postHogConfig(POSTHOG_ENV);
    if (typeof config === 'string') throw new Error('config');
    expect(postHogDeleteRequest(config, KEY)).toEqual({
      url: POSTHOG_URL,
      method: 'POST',
      headers: { authorization: 'Bearer phx_test', 'content-type': 'application/json' },
      body: JSON.stringify({ distinct_ids: [KEY], delete_events: true }),
    });
  });

  it('counts 2xx and 404 as done, anything else as failed, and never throws', async () => {
    for (const [reply, status] of [
      [{ status: 202 }, 'done'],
      [{ status: 404 }, 'done'],
      [{ status: 403 }, 'failed'],
      [new TypeError('fetch failed'), 'failed'],
    ] as const) {
      const { deps: run } = deps(POSTHOG_ENV, { [POSTHOG_URL]: [reply] });
      expect((await eraseAnalytics(KEY, run)).posthog).toBe(status);
    }
  });
});

describe('BigQuery', () => {
  it('signs a service-account token request with the key', () => {
    const config = bigQueryConfig(BIGQUERY_ENV);
    if (typeof config === 'string') throw new Error('config');
    const [header = '', claims = '', signature = ''] = serviceAccountAssertion(config, NOW).split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'kid-1' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/bigquery',
      aud: TOKEN_URL,
      iat: NOW.getTime() / 1000,
      exp: NOW.getTime() / 1000 + 3600,
    });
    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, signature, 'base64url')).toBe(true);
  });

  it('sends the key only as a query parameter, in the dataset’s location', () => {
    const config = bigQueryConfig(BIGQUERY_ENV);
    if (typeof config === 'string') throw new Error('config');
    const request = bigQueryRequest(config, 'token', KEY);
    const body = JSON.parse(request.body);
    expect(request.url).toBe(QUERY_URL);
    expect(body).toMatchObject({
      useLegacySql: false,
      location: 'US',
      parameterMode: 'NAMED',
      queryParameters: [{ name: 'key', parameterType: { type: 'STRING' }, parameterValue: { value: KEY } }],
    });
    expect(body.query).not.toContain(KEY);
    expect(body.query).toContain('`onquest-test.onquest_analytics.events`');
  });

  it('exchanges the token, runs the script and waits once for a slow job', async () => {
    const { deps: run, calls } = deps(BIGQUERY_ENV, {
      [TOKEN_URL]: [{ body: { access_token: 'ya29.test' } }],
      [`${QUERY_URL}/job-1`]: [{ body: { jobComplete: true } }],
      [QUERY_URL]: [{ body: { jobComplete: false, jobReference: { jobId: 'job-1' } } }],
    });
    expect((await eraseAnalytics(KEY, run)).bigquery).toBe('done');
    expect(calls.map((call) => call.url.split('?')[0])).toEqual([TOKEN_URL, QUERY_URL, `${QUERY_URL}/job-1`]);
    expect(String(calls[0]?.init?.body)).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
    expect(calls[2]?.url).toContain('location=US');
  });

  it('fails without throwing when the token, the query or the wait fails', async () => {
    const cases: Record<string, Reply[]>[] = [
      { [TOKEN_URL]: [{ status: 400 }] },
      { [TOKEN_URL]: [{ body: { access_token: 'ya29.test' } }], [QUERY_URL]: [{ status: 403 }] },
      {
        [TOKEN_URL]: [{ body: { access_token: 'ya29.test' } }],
        [`${QUERY_URL}/job-1`]: [{ body: { jobComplete: false } }],
        [QUERY_URL]: [{ body: { jobComplete: false, jobReference: { jobId: 'job-1' } } }],
      },
    ];
    for (const replies of cases) {
      const { deps: run } = deps(BIGQUERY_ENV, replies);
      expect((await eraseAnalytics(KEY, run)).bigquery).toBe('failed');
    }
  });

  it('logs no key and refuses a key that is not a user key', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { deps: run, calls } = deps({ ...POSTHOG_ENV, ...BIGQUERY_ENV }, { [POSTHOG_URL]: [{ status: 500 }], [TOKEN_URL]: [{ status: 500 }] });
    await eraseAnalytics(KEY, run);
    expect(JSON.stringify(errors.mock.calls)).not.toContain(KEY);
    expect(await eraseAnalytics("x' OR 1=1", run)).toEqual({ posthog: 'failed', bigquery: 'failed' });
    expect(calls).toHaveLength(2);
    errors.mockRestore();
  });
});

describe('the erasure script (run in Postgres with BigQuery’s functions translated)', () => {
  // Shared device: A and B both sign in on one browser (anon_S). Deleting A removes A's rows and
  // the device's signed-out rows, and keeps B's signed-in rows and account_deleted (spec §5.2).
  const toPostgres = (sql: string, key: string) =>
    sql
      .replace(/`[^`]+\.([a-z_]+)`/g, '$1')
      .replace(/JSON_VALUE\(properties, '\$\.([a-z_]+)'\)/g, "(properties->>'$1')")
      .replace(/STARTS_WITH\(/g, 'starts_with(')
      .replace(/UNNEST\(\[1\]\)/g, 'unnest(array[1])')
      .replace(/CURRENT_TIMESTAMP\(\)/g, 'current_timestamp')
      .replaceAll('@key', `'${key}'`);
  const row = (id: string, event: string, distinctId: string, properties: object) =>
    `('${id}', '${event}', '${distinctId}', '${JSON.stringify(properties)}')`;

  it('stores the device ids, deletes late device rows on a re-run, and never touches B', async () => {
    const db = new PGlite();
    await db.exec(`
      create table events (uuid text, event text, distinct_id text, properties jsonb);
      create table deleted_users (user_id text not null, deleted_at timestamptz not null);
      create table deleted_devices (anon_id text not null, user_id text not null, deleted_at timestamptz not null);
      insert into events values
        ${row('a-signed-in', 'quest_viewed', 'user-a', { user_id: 'user-a', anon_id: 'anon_S' })},
        ${row('a-server', 'blog_published', 'user-a', { user_id: 'user-a', anon_id: null })},
        ${row('s-signed-out', 'app_opened', 'anon_S', { user_id: null, anon_id: 'anon_S' })},
        ${row('b-signed-in', 'quest_viewed', 'user-b', { user_id: 'user-b', anon_id: 'anon_S' })},
        ${row('b-v1-key-in-props', 'blog_viewed', 'user-b', { anon_id: 'anon_S' })},
        ${row('deleted', 'account_deleted', 'deleted_1', { user_id: 'user-a', anon_id: null })},
        ${row('c', 'quest_viewed', 'user-c', { user_id: 'user-c', anon_id: 'anon_C' })};
    `);
    const script = toPostgres(bigQueryErasureScript('onquest-test', 'onquest_analytics'), 'user-a');
    expect(script).not.toMatch(/JSON_VALUE|STARTS_WITH|@key|`/);
    const remaining = async () =>
      (await db.query<{ uuid: string }>('select uuid from events order by uuid')).rows.map((r) => r.uuid);

    await db.exec(script);
    expect(await remaining()).toEqual(['b-signed-in', 'b-v1-key-in-props', 'c', 'deleted']);
    expect((await db.query('select user_id from deleted_users')).rows).toEqual([{ user_id: 'user-a' }]);
    expect((await db.query('select anon_id, user_id from deleted_devices')).rows).toEqual([
      { anon_id: 'anon_S', user_id: 'user-a' },
    ]);

    // A late signed-out row from A's device, after every row linking it to A is gone.
    await db.exec(`insert into events values ${row('s-late', 'quest_viewed', 'anon_S', { anon_id: 'anon_S' })};`);
    await db.exec(script);
    expect(await remaining()).toEqual(['b-signed-in', 'b-v1-key-in-props', 'c', 'deleted']);
    expect((await db.query('select count(*)::int as n from deleted_users')).rows).toEqual([{ n: 1 }]);
    expect((await db.query('select count(*)::int as n from deleted_devices')).rows).toEqual([{ n: 1 }]);
    await db.close();
  });
});

describe('the daily re-run window', () => {
  it('covers 30 days', () => {
    expect(erasureWindowStart(NOW).toISOString()).toBe('2026-10-28T02:00:00.000Z');
  });

  it('counts skipped and failed as pending', () => {
    expect(erasureComplete({ posthog: 'done', bigquery: 'done' })).toBe(true);
    expect(erasureComplete({ posthog: 'done', bigquery: 'skipped' })).toBe(false);
    expect(erasureComplete({ posthog: 'failed', bigquery: 'done' })).toBe(false);
  });
});

it('erasure.ts is server-only (spec §11 privacy)', () => {
  const source = readFileSync(join(process.cwd(), 'lib/analytics/erasure.ts'), 'utf8');
  expect(source.startsWith("import 'server-only';")).toBe(true);
});
