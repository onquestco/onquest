# Spec: Analytics taxonomy v2

| | |
|---|---|
| PRD | `docs/prds/2026-11-analytics-v2.md` (CTO brief, 26 Nov 2026) + `docs/analytics/v2/{events,common,codes,metrics}.csv` (export of the Google Sheet "OnQuest Taxonomy v2 (from code)", approved by the CTO) |
| Status | **Approved (26 Nov 2026, CTO).** Revision 5: one PostHog project and dataset for Preview and Production; no internal-account marking (CTO, 26 Nov) |
| Build mode | Backend + Frontend split, 14 tasks (AN-01 … AN-14), merged strictly in number order (§12.1) |
| Tracker IDs | OQ-12, OQ-22 · AN-01 #50, AN-02 #51, AN-03 #52, AN-04 #53, AN-05 #54, AN-06 #55, AN-07 #56, AN-08 #57, AN-09 #58, AN-10 #59, AN-11 #60, AN-12 #61, AN-13 #62, AN-14 #64 (label `spec:analytics-v2`) |

**Readiness.** The CSVs give every event, property, allowed value, firing rule, code location and metric. The brief gives the order, the rules and the CTO decisions. There is no user-facing UI, so empty, loading and error states don't apply: analytics never shows anything and never fails an action. The UX test plan is replaced by an event check on the Vercel preview (§11). Technical gaps the sheet leaves open are decided in §13. The build can start. Some switches wait for the founder and the CTO; they are listed as **gates** in §8.1. The main one: the privacy policy update must be live before any new cookie or any `user_info` is sent. Until the founder says otherwise, the spec assumes AN-03 ships with the new cookie switched off and turns it on only after the policy is live (review founder #1, technical #4).

**No database migration.** Nothing in this spec adds or changes a Postgres table, function, grant or RLS policy. Erasure reads `deleted_accounts` through the admin client, which already has `select` as `service_role`. BigQuery gets views and one key-only table (§5.3). The CTO applies them by hand and dry-runs them first; that is a gate on merging AN-01.

**Not done by this PR:** the CLAUDE.md line in §7.1. Agents don't edit CLAUDE.md, so the coordinator applies it after the CTO approves.

## 1. Summary

Nothing changes for users except one privacy-policy update.

- **Taxonomy.** `lib/analytics/taxonomy.ts` is regenerated from the v2 CSVs: 72 events, with typed codes instead of strings.
- **Identity and common properties.** Identity is decided on our server. `/ingest` and `trackServer` take the user from the verified session, and the browser can't claim one. Every event gets the v2 common properties and, behind the policy gate, `user_info` (geo, username, email; decision 0004).
- **Renames.** The 14 live events are renamed in one step. A BigQuery view maps their history to the new names.
- **New events.** The 57 new events are added screen by screen, in the sheet's order.
- **Deletion.** Deleting an account now also deletes the person's PostHog data and BigQuery rows. This is proved end to end on Preview and then in Production before `user_info` turns on.

## 2. Acceptance criteria map

| Brief / sheet criterion | Satisfied by | Proved by |
|---|---|---|
| AC1 `identify()` everywhere: every signed-in event is on the person | `/ingest` sets `distinct_id` and `user_id` from the verified session and sends the `$identify` merge itself (§3.2). `trackServer` uses the session user. Browser `$identify`/alias events are dropped | `ingestEnrich.test.ts` (spoofed distinct id, browser `$identify`, alias and merge all rejected); preview check E1 |
| AC2 `setScreen()` everywhere: no `unknown` / `server` screen | `screenFor(routeTemplate)` in `Pageviews.tsx` on every route change. `PublishSheet` sets `publish`. Server events read the screen from `oq_actx` once the cookie is on, else `null` | `screens.test.ts` (route groups and rewrites resolved, §6.1); E2 |
| AC3 common properties per `common.csv` on every event | `lib/analytics/common.ts`, one shape for browser and server events | `common.test.ts`, `server.test.ts` |
| AC4 ~~`is_internal_flg`~~ | **Dropped by the CTO (26 Nov 2026): no internal-account marking.** No property, env var, BigQuery table or Metrics filter for team accounts | `taxonomyRules.test.ts` (no `is_internal_flg` in the generated common properties) |
| AC5 `is_bot_flg` | The browser drops bots, as today. `/ingest` and `trackServer` set the flag from the user agent. `events_clean` leaves out `true` | `privacy.test.ts`, `ingestEnrich.test.ts` |
| AC6 `user_info` {geoip country/region/city, username, email_id}, null when signed out, never the raw IP | `lib/analytics/userInfo.ts` (`server-only`), attached only by `/ingest` and `trackServer` for the session's own user, behind `ANALYTICS_USER_INFO`. Bodies that can't be parsed are dropped | `userInfo.test.ts`, `ingestEnrich.test.ts` (browser `user_info` overwritten; gzip, oversized and junk bodies dropped; no `x-forwarded-for` upstream) |
| AC7 generated `taxonomy.ts` from the v2 CSVs replaces the old one; script kept | `taxonomyFromCsv.ts` v2 reader and `generate.ts` (`npm run analytics`) | `taxonomy.test.ts`; the **taxonomy check test** `taxonomyRules.test.ts` (§11) |
| AC8 14 live events renamed, blog_* keep working, change log updated | AN-02 renames every call site in one PR. Missing properties never drop an event (§4.1). `events_clean.sql` maps old names and values to v2. Row added to `change-log.csv` | `renameMap.test.ts`; `blogEvents.test.ts` old-shape draft still sends `blog_published`; "Blog adoption" and "Blog read-through" dry-run over history |
| AC9 57 To-build events wired, in the sheet's order | AN-05 … AN-13 (§12) | Property-builder unit tests; E3; AN-14 manual gate |
| AC10 no user text in properties (lengths and counts only); email_id is the only exception | Generated rules: free STRING properties only for keys and an allowlisted few, with strict patterns (§4.1). `user_info` attached on the server only | `taxonomyRules.test.ts`, `validate.test.ts` |
| AC11 server events are the source of truth for counts | §10 | `taxonomyRules.test.ts` |
| AC12 account deletion removes the user's analytics | `lib/analytics/erasure.ts`: PostHog bulk delete, BigQuery DELETE and the `deleted_users` anti-join. Runs from `deleteAccount()` and again from the daily cron for 30 days | `erasure.test.ts`; **gates G5/G6**: proved on Preview against the shared project and dataset with a team test account, then on Production, before `user_info` turns on |
| AC13 CLAUDE.md rule, decision record, privacy-policy flag | Decision 0004; §7.1 line (coordinator); §14 founder items | Review |
| AC14 Metrics tab queries stay valid | `events_clean` exposes the columns they use. `metricsSql.test.ts` checks event names and properties. CTO dry-run is gate G1 | `metricsSql.test.ts`, `bq query --dry_run` |
| AC15 tests per CLAUDE.md | Vitest next to each file. No RLS change, so no new `tests/db/` file; `accountDelete.test.ts` must still pass | CI |

## 3. Approach

### 3.1 Taxonomy as code

`npm run analytics` reads `docs/analytics/v2/events.csv` and writes `lib/analytics/taxonomy.ts`.

- **What it generates.** One `EVENTS` object keyed by event name. Each entry has its `type` (`click`, `view`, `client` or `server`), who it is about (`user`: `signed_in`, `optional` or `other_user`, from the `user_id` column) and its property rules.
- **Who sends what.** `click`, `view` and `client` events are sent from the browser with `track()`. `server` events are sent with `trackServer()`.
- **Type safety.** Calling with the wrong sender, an old name or an unknown property is a type error.
- **Old files.** The v1 CSVs move to `docs/analytics/v1/`. The v1 rules are frozen into `lib/analytics/taxonomyV1.ts`, which only `/ingest` uses (§3.5).

AN-01 adds the v2 generator and writes `taxonomy.ts` as **`taxonomyV2.ts`**, next to the untouched v1 file, so nothing in the app changes. AN-02 switches the call sites to it, renames it to `taxonomy.ts` and freezes the old one as `taxonomyV1.ts`. That splits the largest task (review #11) without a release where the code doesn't type-check.

### 3.2 Identity, user_info and geo: decided on the server

```
browser track() ──► /ingest (our route handler) ──► PostHog ──hourly──► BigQuery events
  common props       distinct_id + user_id   ← verified session, else the body's anon_id
  no identity        $identify               ← sent by /ingest itself; browser ones dropped
  no user_info       user_info (gate), is_bot_flg, env, os/browser,
                     country; drops IP; $geoip_disable; v2 or v1 allowlist
server action / auth route ──► trackServer() ── same rules from the request ──► PostHog
```

**`/ingest` is the only trust boundary** (`lib/analytics/ingestEnrich.ts`, called from `app/ingest/[...path]/route.ts`).

1. **Body checks.** The body must be JSON (a single event or a `batch` array). It must not be compressed: requests with a `content-encoding` header or a `compression` query parameter are rejected. It must be ≤ 64 KB. Anything else gets **204 and is not forwarded**. Our `client.ts` never compresses, so only foreign senders are affected.
2. **Session lookup.** The session is looked up once per request with `supabase.auth.getUser()`, through `userInfo.ts`'s bounded cache (§4.2).
3. **Per event:**
   - **`distinct_id`.** The verified user key. If there is no session, the body's `properties.anon_id` when it matches `^anon_[0-9a-f-]{36}$`. Otherwise the event is dropped.
   - **`user_id`.** The verified key, or null.
   - **Merge events.** `$identify`, `$create_alias` and `$merge_dangerously` from the browser are dropped. When a verified key arrives with an `anon_id` that this server instance hasn't merged in the last 24 hours (LRU, 10,000 pairs), `/ingest` adds one `$identify` (`distinct_id = key`, `$anon_distinct_id = anon_id`). Repeats are no-ops in PostHog. This is the only `identify()` in the system (D2).
   - **Server-set properties.** `user_info`, `is_bot_flg`, `env`, `os`, `browser`, `country` and `$geoip_disable: true` are set here, overwriting anything the browser sent.
   - **Allowlist.** Properties are filtered to the event's allowlist (§3.5) plus the common properties.
4. **Forwarding.** The request is forwarded to PostHog **without** `x-forwarded-for`.

**Server events** read the request context. `cookies()` gives `oq_actx` (anon_id, session_id, screen, platform) once the cookie is switched on (§4.2) and the session. `headers()` gives geo and the user agent. `after()` in server actions and route handlers can read both. The session user's key is the event's `user_id` and `distinct_id`, except for `notification_sent` (recipient key, null anon/session/`user_info`), `account_deleted` (§5.2) and `setting_changed` from the email unsubscribe link (the signed link's key, no session, null anon/session/`user_info`).

**Geo** comes only from Vercel's headers: country, region and URL-decoded city. Every event keeps a top-level `country`, signed out too (D14). Region and city exist only inside `user_info`.

**No `oq_uid` cookie.** The previous revision had the browser call `identify()` from a cookie. That let anyone file events under someone else's key (review #1). The browser now knows nothing about identity: `client.ts` drops its exported `identify()` and `forgetUser()`.

### 3.3 Renames without a gap (AN-02)

All 14 renamed events switch in one PR, so no release goes without a blog event.

- **Properties AN-02 can't fill yet** are optional until the task that fills them (§4.1 table). An event is never dropped for a missing or bad property (§4.2).
- **History.** Old rows in BigQuery keep their old names and string values. `events_clean` maps them to v2 (§5.3).
- **Quest halves.** The quest halves of the merged events are new sends and land in AN-09.

### 3.4 Order

Foundations come first:

- AN-01: generator, rules and tests.
- AN-02: renames.
- AN-03: identity, common properties and `user_info`.
- AN-04: erasure.

Then the sheet's Summary order:

- Quest view (AN-05).
- Create (AN-06, AN-07).
- Sign-in (AN-08).
- Share, social and notifications (AN-09, AN-10).
- Everything else (AN-11 … AN-13).
- The end-to-end gate (AN-14).

Tasks merge strictly in number order (§12.1).

### 3.5 Old tabs and rollback through `/ingest`

`/ingest` keeps two allowlists. v2 names are filtered by `taxonomy.ts`. v1 names, sent by a browser tab still open on the old bundle or by a rolled-back release, are filtered by the frozen `taxonomyV1.ts`. They keep their v1 properties, so `events_clean` can map them. Identity, `user_info` and IP rules apply to both. Names in neither list are dropped. `taxonomyV1.ts` and the v1 branch are removed 30 days after AN-02 deploys. That removal is in §15, as the contract step.

## 4. Contract

### 4.1 Taxonomy (`lib/analytics/taxonomyFromCsv.ts` → generated `taxonomy.ts`)

```ts
export type EventType = 'click' | 'view' | 'client' | 'server';
export type PropertyType = 'STRING' | 'BOOL' | 'INT64' | 'FLOAT64' | 'TIMESTAMP';
export type PropertyRule = {
  type: PropertyType;
  required: boolean;              // drives types and dev warnings only, never drops an event
  values?: (string | number)[];   // "0 / 1 / 2" → [0, 1, 2] (INT64); "google / email_link" (STRING)
  list?: string[];                // comma lists: fields_changed, change_types
  min?: number; max?: number;     // "0 – 6", "3–20"; "2–" → min only
  pattern?: 'key' | 'town' | 'utm';
};
export type EventRule = {
  type: EventType;
  user: 'signed_in' | 'optional' | 'other_user';
  properties: Record<string, PropertyRule>;
};
export const EVENTS = { /* generated, sorted */ } as const satisfies Record<string, EventRule>;
export type BrowserEventName = /* type click | view | client */;
export type ServerEventName  = /* type server */;
export type EventProps<Name extends keyof typeof EVENTS> = /* required keys required, optional keys optional */;
```

Parse rules, each covered by `taxonomy.test.ts`:

- **Rows.** A row with an empty `name` adds properties to the event above. Section rows and `(common props only)` rows are skipped. Columns are found by their header names.
- **Required.** A property is required unless one of these applies:
  - its sentence-level wording says it can be absent: the description with its code meanings (`N = …` items, up to the next `/` or `;`) removed, or the allowed values, mention `null`, `if any` or `reserved`, or a limit such as `Quests tab only:` / `only when|for|if|on`. A code meaning like "3 = Place (reserved)" or a bare "(count only)" doesn't make the property optional (review round 1, should-fix 6);
  - it is listed in `OPTIONAL_OVERRIDES` (below).

  The test snapshots the full optional list.
- **Common properties.** The generated `COMMON_PROPERTIES` is `common.csv`'s top-level rows plus `env` and `type`, which §4.2 lists but the sheet has no row for. `/ingest`'s allowlist (AN-03) uses it, so neither is stripped.
- **Free STRINGs** (no allowed values) are only allowed in these forms:

  | Property | Pattern |
  |---|---|
  | keys (`*_id`, `content_id`, `view_id`) | `'key'` = `^[a-z0-9_-]{1,64}$`i |
  | `chip_name` | `'town'` = `^[\p{L}\p{M} .'-]{1,60}$`u |
  | `utm_source` | `'utm'` = `^[a-z0-9_.-]{1,40}$` after lowercasing; anything else is sent as `other` |
  | `change_types` | list of `0…11` |
  | `fields_changed` | list `name,username,photo,city,bio` |

  **Any other free STRING fails the generator.**
- **`TIMESTAMP`** values are ISO-8601 with an offset.
- **Derived, never sent.** `first_seen_ts` and `days_since_last_sign_in` are derived in `events_clean` (D7).

`OPTIONAL_OVERRIDES` (in `taxonomyFromCsv.ts`). **Permanent** entries are conditional by nature:

| Property | Why optional |
|---|---|
| `referrer_quest_id`, `referrer_blog_id`, `referrer_owner_user_id` | Only when a shared link brought the person in |
| `utm_source` | Only when the link has one |
| `attempt` | Only for error_type 1 |
| `from_visibility` | Unknown for blog history |
| `blog_published.minutes_since_start` | Old drafts have no `startedAt` (review #2; `blogEvents.test.ts` old-draft case) |
| `quest_viewed.source`, `blog_viewed.source`, `profile_viewed.source`, `guide_viewed.source` | Untagged in-app links |
| `first_seen_ts`, `days_since_last_sign_in` | Derived in BigQuery |

**Temporary** entries cover properties AN-02 can't fill yet. Each one names the task that fills it, and that task deletes the entry; its Done-when says so.

| Event.property | Filled by |
|---|---|
| `create_option_click.from_screen` | AN-03 (screens) |
| `blog_viewed.read_time_min` | AN-13 |
| `content_liked.owner_user_id` | AN-09 |
| `comment_posted.owner_user_id`, `comment_posted.is_owner_flg` | AN-09 |
| `comments_toggled.comment_count` | AN-09 |
| `visibility_changed.days_since_publish` | AN-09 |
| `content_deleted.like_count`, `.comment_count`, `.age_days`, `.photo_count` (posted blogs) | AN-09 |
| `blog_published.is_first_blog_flg` | AN-09 |
| `blog_updated.days_since_post` | AN-09 |
| `blog_editor_action.photo_count`, `.blocked_flg` | AN-13 |

AN-02 fills these itself:

| Property | Source |
|---|---|
| `blog_viewed.author_user_id` | The provider's `ownerKey` |
| `content_liked.like_count_after` | `set_blog_like`'s `like_count` |
| `content_liked.source` | `blog_page` / `feed` / `after_sign_in` → 0 / 2 / 3 |
| `comment_posted.comment_length` | Existing length |
| `blog_create_started.click_loc` | `source` → 0 / 1 |
| `content_deleted.photo_count` for drafts | `deletedProperties` |
| Everything else in the rename map (§5.3) | The mapped v1 value |

### 4.2 Sending (`client.ts`, `server.ts`, `common.ts`, `userInfo.ts`)

```ts
// Browser
track<Name extends BrowserEventName>(event: Name, properties: EventProps<Name>): void;
setScreen(screen: Screen): void;              // Screen = the 15 common.csv values
trackPageview(pathname: string): void;        // + setScreen(screenFor(routeTemplate(pathname)))
// identify() and forgetUser() are removed: identity is decided by /ingest (§3.2)

// Server
trackServer<Name extends ServerEventName>(
  event: Name,
  userKey: string | null,  // the event's user_id; must equal the session user except for
                           // notification_sent (recipient), account_deleted (§5.2) and
                           // setting_changed from app/email/unsubscribe (signed link, no session;
                           // user_info null, anon/session null)
  properties: EventProps<Name>,
): Promise<void>;
```

**Validation never drops an event** (review #2).

- A missing required property, an unknown property or a bad value: the event is still sent.
- Unknown properties and bad values are removed from it.
- Each problem is reported by property **name** only (never the value) with `console.warn` outside production.
- Unit tests use `expectNoProblems(event, builder(...))` from `validate.ts`, so every property builder proves it fills its required properties.

Common properties on every event (`common.ts`, from `common.csv`):

| Property | Browser event | Server event |
|---|---|---|
| `event_id` | `crypto.randomUUID()` | same |
| `type` | event type from the taxonomy | `server` |
| `user_id` | `/ingest`, verified session, else null | session user (or the recipient for `notification_sent`) |
| `anon_id`, `session_id` | `ids.ts` (localStorage, as today) | from `oq_actx` when the cookie is on; otherwise null. Always null on `notification_sent` and `account_deleted` |
| `client_ts` | device time, ISO | absent |
| `platform` | `0` mobile (pointer: coarse) / `1` desktop | `oq_actx`, else from the user agent (`Mobi` → 0) |
| `os`, `browser` | `/ingest`, `userAgent.ts` | same function |
| `app_version` | short SHA | same |
| `env` | `production` / `preview`, from `NEXT_PUBLIC_VERCEL_ENV` (anything else, e.g. local dev, sends `preview`) | `production` / `preview`, from `VERCEL_ENV` (same rule); `/ingest` overwrites the browser's value with its own |
| `screen` | current screen (§6.1) | `oq_actx`, else null |
| `country` | `x-vercel-ip-country` at `/ingest` | request header |
| `is_bot_flg` | `/ingest`: `isBot(user-agent)` | same |
| `user_info` | `/ingest` when the gate allows (below), else null | same; null for `notification_sent`, `account_deleted` |

**`oq_actx` cookie** (the only new cookie): `v1.<anon_id>.<session_id>.<screen>.<platform>`, `Path=/; SameSite=Lax; Max-Age=1800`, not httpOnly.

- `client.ts` writes it only when `NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE=on`. That flag is **off until the privacy policy is live** (gate G3). While it's off, server events carry null `anon_id`, `session_id` and `screen`; `events_clean` fills `anon_id` from the same user's browser rows (§5.3).
- The server accepts the cookie only if it matches `^v1\.anon_[0-9a-f-]{36}\.[0-9a-f-]{36}\.[a-z_]{2,20}\.[01]$`.
- Nothing in it identifies the person, so a forged one can only mislabel the forger's own server events.

**Timestamps.** The browser does **not** send PostHog `timestamp`, so PostHog stamps server time (the sheet's `ts = server_ts`). Server events send `timestamp` = now.

**`user_info`** (`lib/analytics/userInfo.ts`, `import 'server-only'`):

```ts
export const UserInfoSchema = z.object({
  geoip: z.object({ country: z.string().regex(/^[A-Z]{2}$/).nullable(),
                    region: z.string().max(10).nullable(), city: z.string().max(80).nullable() }).nullable(),
  username: z.string().max(20).nullable(),   // profiles.handle; null before onboarding
  email_id: z.string().max(320).nullable(),
}).nullable();

/** The session's own user_info, or null. Returns null unless the request's verified session user
 *  is `expectedUserKey`, so a cron job, the unsubscribe link or notification_sent can never look up
 *  someone's email by key. */
export async function userInfoForSession(expectedUserKey: string): Promise<UserInfo>;
```

- **Gate.** `ANALYTICS_USER_INFO` has three values:
  - unset or `off`: always null;
  - `team`: only when the user key is in `ANALYTICS_USER_INFO_TEAM_KEYS`, a comma list of the team's test-account keys used **only** for this gate (nothing is marked or stored with it);
  - `on`: every signed-in person.

  Preview uses `team` and stays there (review #12, CTO 26 Nov). Production uses `off` until gates G3–G6, then `on`.
- **Cache.** One LRU, max 1,000 entries, 60 s TTL, keyed by SHA-256 of the access token. It holds `{ userKey, email, handle }`.
- **Lookups.** `getUser()` gives the key and email. The handle comes from the request's own RLS client: `profiles.select('handle').eq('key', user.id).maybeSingle()`. `/ingest` and `trackServer` share this module.

**No internal-account marking** (CTO, 26 Nov 2026). There is no `is_internal_flg` property, no internal-keys list and no `internal_users` table; team traffic is counted like anyone's. The `is_internal_flg` row in `common.csv` and the `internal_users` filter in Metrics query 1 are removed from the committed CSVs; the CTO makes the same change in the sheet so the next export matches.

### 4.3 Server actions

There are no new actions. Changed inputs are additive and optional:

| Action | Input change | Used for | Task |
|---|---|---|---|
| `publishQuest` | `+ analytics?: { clickLoc?: int 0–10, editCount?: int ≥ 0, changeTypes?: int[] (0–11, unique) }` | `quest_creation_complete`, `quest_updated` | AN-06 (schema), AN-07 (sends it) |
| `setLike`, `setFollow`, `setBlogLike` | `source` already arrives; mapped to the v2 code | `content_liked`, `user_followed` | AN-02 / AN-09 |
| `createQuest` | `source` already arrives; mapped to `click_loc` | `quest_draft_created` | AN-06 |
| `reportCreateProgress` | unchanged; now sends `quest_arranged` | | AN-06 |

The `?source=` strings in `/quests/new` links stay. `lib/analytics/codes.ts` maps them and every other internal enum to v2 codes. Merge rule: one section per task, append-only (§12.1). `codes.test.ts` checks each number against `codes.csv`.

### 4.4 Routes and link tags

- **`app/ingest/[...path]/route.ts`**: same paths, rules as in §3.2.
- **`?src=<code>` on in-app links** to Quests, blogs, profiles and guides. Links are built with `withSrc(href, code)` (`lib/analytics/src.ts`, AN-03). The page reads the tag once and removes it with `history.replaceState`. Cached pages ignore query strings when rendering.
- **`?src=email` on notification email links** (AN-09).
- No new pages, and no metadata or sitemap change.

## 5. Database and storage

### 5.1 Postgres

None. No `tests/db/` additions; `accountDelete.test.ts` must still pass.

### 5.2 Erasure on account deletion (AN-04)

`lib/analytics/erasure.ts` (`import 'server-only'`):

```ts
export async function eraseAnalytics(userKey: string): Promise<{ posthog: Status; bigquery: Status }>; // Status = 'done' | 'skipped' | 'failed'
```

**Order inside `deleteAccount()`**, after the database delete succeeded:

1. **Send `account_deleted`** (AN-04 owns this event). Await it, don't defer it to `after()`.
   - `distinct_id` is a fresh `deleted_<uuid>`, so the event never recreates or attaches to the deleted person in PostHog.
   - The properties are `user_id = key` and the counts.
   - `anon_id`, `session_id` and `user_info` are null, so the kept row can't be linked back to a device (review #7b).
2. **PostHog.** `POST https://{POSTHOG_API_HOST}/api/projects/{POSTHOG_PROJECT_ID}/persons/bulk_delete/` with `{ "distinct_ids": [key], "delete_events": true }` and `Authorization: Bearer {POSTHOG_PERSONAL_API_KEY}` (scope `person:write`).
   - This removes the person and the anon ids merged into it, and **queues** their events for deletion. PostHog deletes events in the background, so "person gone" isn't "events gone".
   - The builder confirms the endpoint, the body and the deletion timing against PostHog's API docs, and writes them into the runbook (review #7d).
   - A 404 counts as done.
3. **BigQuery.** One `jobs.query` script, with `@key` as a parameter. The same script runs on the first run and on every re-run.
   ```sql
   -- Remember the person (key only) and their device ids (random ids, not personal), so re-runs
   -- still find device rows that arrive late, after the rows linking them to the key are gone.
   INSERT INTO `{dataset}.deleted_users` (user_id, deleted_at) SELECT @key, CURRENT_TIMESTAMP()
     FROM UNNEST([1]) WHERE NOT EXISTS (SELECT 1 FROM `{dataset}.deleted_users` WHERE user_id = @key);
   INSERT INTO `{dataset}.deleted_devices` (anon_id, user_id, deleted_at)
     SELECT DISTINCT JSON_VALUE(properties, '$.anon_id'), @key, CURRENT_TIMESTAMP() FROM `{dataset}.events`
     WHERE (distinct_id = @key OR JSON_VALUE(properties, '$.user_id') = @key)
       AND JSON_VALUE(properties, '$.anon_id') IS NOT NULL
       AND JSON_VALUE(properties, '$.anon_id') NOT IN
         (SELECT anon_id FROM `{dataset}.deleted_devices` WHERE user_id = @key);
   DELETE FROM `{dataset}.events`
   WHERE event != 'account_deleted' AND (
     distinct_id = @key OR JSON_VALUE(properties, '$.user_id') = @key
     OR (JSON_VALUE(properties, '$.anon_id') IN
           (SELECT anon_id FROM `{dataset}.deleted_devices` WHERE user_id = @key)
         -- Only signed-out rows or this person's own: never another person's signed-in rows on a
         -- shared device (their distinct_id is their own key, so it can't match @key above).
         AND (JSON_VALUE(properties, '$.user_id') IS NULL OR JSON_VALUE(properties, '$.user_id') = @key)
         AND (distinct_id = @key OR STARTS_WITH(distinct_id, 'anon_'))));
   ```
   - The request is authenticated with a service-account token signed with `node:crypto` (no new dependency).
   - The project id comes from the key JSON's `project_id`. The dataset and location come from `BIGQUERY_DATASET` and `BIGQUERY_LOCATION`; the key has no location (review #7e).
   - Service account `analytics-eraser` has `roles/bigquery.jobUser` on the project and `roles/bigquery.dataEditor` on that dataset only. The key is in `BIGQUERY_ERASER_KEY` (base64 JSON).
   - A shared device's **signed-out** rows go too. That's accepted: they hold no personal data, and erring towards deletion is the safer side. Another person's **signed-in** rows on that device are never touched (the `user_id` and `distinct_id` guards). `erasure.test.ts` checks the built SQL for a shared device: A and B on one `anon_id`, deleting A keeps B's rows.
4. **Failure handling.** Steps 2 and 3 are best effort. A failure is logged by error name only and never fails the deletion.

**Daily re-run, 30 days.** `app/api/cron/finish-deletions` calls `eraseAnalytics` for every `deleted_accounts` row with `saved_at` in the last 30 days. It uses an admin `select`; markers live at least 30 days. Because the device ids are stored in `deleted_devices` on the first run, the re-runs still delete signed-out device rows that reach BigQuery late (export lag, backfill).

- The re-run catches rows still in the hourly export and rows from a paused-then-backfilled export, and it retries failures (review #7a).
- **Belt and braces:** `events_clean` anti-joins `deleted_users` and `deleted_devices` (§5.3), so a row that arrives after day 30 is still never read.

**Unset env, or failure two days running.** The cron logs `Analytics erasure pending: N`. `docs/runbooks/analytics-erasure.md` has the manual step (PostHog person delete in the UI, plus the same SQL with `bq query`) and the proof records for G5/G6.

**Retention after deletion.** BigQuery keeps deleted rows in time travel (7 days by default) plus fail-safe (7 days). The policy text therefore says "within 30 days" (founder item 2).

### 5.3 BigQuery (AN-01 writes the SQL; the CTO applies it and dry-runs it: gate G1)

Files in `docs/analytics/bigquery/`:

| File | Contents |
|---|---|
| `deleted_users.sql` | Key-only table `(user_id STRING, deleted_at TIMESTAMP)` |
| `deleted_devices.sql` | Table `(anon_id STRING, user_id STRING, deleted_at TIMESTAMP)`: device ids of deleted people (random ids and keys, nothing personal) |
| `events_people_all.sql` | Founders-only view holding all the logic below, with `user_info`, both environments (review #10d) |
| `events_clean_all.sql` | `events_people_all` without `user_info` (so no email, username or city), both environments, for Preview checks |
| `events_clean.sql`, `events_people.sql` | The two views above with `env = 'production'`; `events_clean` is what the Metrics queries read |
| `g1_checklist.sql`, `g1_fixture_check.template.sql` | Sources for the two generated G1 files below |
| `g1_fixture_check.sql`, `apply-g1.sql` | Generated by `npm run analytics`. The fixture check runs the real view SQL over literal rows in a scratch dataset and `ASSERT`s the result (renames and values, v1 identity, env, the allowlist, the shared-device guard, `account_deleted`, the `anon_id` fill, `person_id`, derived properties). `apply-g1.sql` is the checklist, the fixture check (Part A) and the six objects (Part B), ready to paste |

The logic lives in `events_people_all` and `events_clean_all` is built from it (rather than `events_people` = `events_clean` + `user_info`), so no self-join is needed; the output is the same. Anyone who isn't a founder and needs `events_clean` gets it as an authorized view in another dataset.

Notes for the SQL:

- **Export columns (CTO's console, 26 Nov 2026).** `properties`, `set`, `set_once` and `person_properties` are JSON; `ip` was filled on 162 rows (nulled once at G1). The views read only `uuid`, `event`, `distinct_id`, `timestamp`, `properties` and `site_url`, never `ip`, `set`, `set_once`, `person_properties` or `elements`. Rewritten properties use `JSON_SET` / `JSON_REMOVE`; the view's `properties` output is JSON, which the Metrics `JSON_VALUE` calls accept.
- **Properties allowlist (review round 1, blocking).** `properties` is rebuilt from an allowlist: every v2 taxonomy property, the common properties (not `user_info`, which is its own column in the people views) and `$current_url` / `$pathname` (route templates on `$pageview`). Every other key is left out, so no `$geoip_*` finer than country, lat/long, postcode, `$ip` or `$set` reaches any view. For rows without `env`, `country` comes from `$geoip_country_code`. `metricsSql.test.ts` checks the allowlist against the taxonomy.
- **One project, one dataset (CTO, 26 Nov 2026).** Preview and Production send to the same PostHog project and the same dataset `onquest_analytics`; every event carries `env` from AN-03 on. Preview has had the PostHog key since 25 Nov 2026, so rows without `env` (v1, and v2 before AN-03) include Preview traffic. Their `env` comes from the first of `$current_url`, `$host` and the export's `site_url` whose host is ours: `onquest.in` / `www.onquest.in` → `production`, `*.vercel.app` or `localhost` → `preview`. Other hosts (e.g. PostHog's own URL in `site_url`) are ignored, and a row with none counts as `production`. **Limit:** the v1 client sends a URL only on `$pageview` and hard-codes it to `https://onquest.in`, so v1 Preview rows can't be told apart by URL. G1 step 5 shows what `site_url` and `app_version` can tell, and the CTO decides whether that window needs more.
- **Columns.** `event_id, name, type, env, ts, client_ts, user_id, anon_id, session_id, platform, os, browser, screen, country, app_version, properties`.
- **Environment filter.** `events_clean` and `events_people` return `env = 'production'` only, so the Metrics queries need no change. For Preview, query the all-environment views `events_clean_all` / `events_people_all` (same columns, no `env` filter; same access rules) and add `WHERE env = 'preview'`. In PostHog, filter insights on `env = production` (G4 adds it to every repointed insight).
  - `user_id`, `anon_id`, `session_id`, `platform` and `screen` come out of `properties`.
  - For v1 rows, `user_id` is `distinct_id` when it doesn't start with `anon_`, and `anon_id` is `properties.anon_id` or that `distinct_id` (review #10b).
  - The export's `ip` column is **never** selected (review #10c).
- **Filters.** Leaves out `$`-events except `$pageview`, `is_bot_flg = true` and duplicate `event_id`s. It also leaves out deleted people's rows, **except `account_deleted`**, which is kept so deletions can still be counted (decision 0004 §6, §10):
  - rows whose `user_id` is in `deleted_users`;
  - rows whose `anon_id` is in `deleted_devices` and whose `user_id` is null or that deleted key (the same shared-device guard as the DELETE).
- **Renames.** v1 rows are renamed and rewritten with the table below.
- **Common values.** `platform` `web_mobile`/`web_desktop` → 0/1. A missing `type` gets the event's v2 type; `$pageview` gets `view`, so the DAU query keeps counting page views.
- **Time.** Rows without `env` (v1, and v2 browser rows before AN-03, whose client still sends `timestamp`) are told apart by that, not by a date constant: for their browser rows `ts` is **device time** and `client_ts = timestamp`. That is documented in the view (review #9c).
- **`anon_id` on server events.** While `oq_actx` is off (until G3), server events have a null `anon_id`. `events_clean` fills it from the same `user_id`'s browser rows: the latest browser `anon_id` at or before the event's `ts`, else the earliest one after it (a sign-up's first browser event can arrive a moment later). The `person_id` logic uses the same mapping. This keeps "Viewer → creator" (joins `quest_viewed` to `quest_creation_complete` by `anon_id`) and `first_seen_ts` working without changing those queries.
- **Derived properties.** `first_seen_ts` is MIN(ts) per (filled) anon_id, written into `user_signed_up`. `days_since_last_sign_in` is LAG over the user's sign-in events.

**Rename map.** It also lives in `lib/analytics/renameMap.ts`, validated by `renameMap.test.ts`:

| Old event (old props) | v2 event | Property mapping |
|---|---|---|
| `create_option_tapped` {option quest/blog, available} | `create_option_click` | option quest→0, blog→1; available→available_flg |
| `blog_managed` {action visibility, value} | `visibility_changed` | content_type 1; blog_id→content_id; value→to_visibility 0/1/2 |
| `blog_managed` {action comments, value on/off} | `comments_toggled` | content_type 1; blog_id→content_id; on→comments_on_flg |
| `blog_managed` {action delete} | `content_deleted` | content_type 1; blog_id→content_id; was_published_flg true |
| `blog_deleted` {status draft, photos, chars_bucket, has_quest} | `content_deleted` | content_type 1; was_published_flg false; photos→photo_count |
| `blog_managed` {action edit} | `blog_updated` | blog_id |
| `blog_liked` {unlike, source} | `content_liked` | content_type 1; unlike→unlike_flg; source blog_page/feed/after_sign_in→0/2/3 |
| `blog_comment_posted` {length} | `comment_posted` | content_type 1; length→comment_length |
| `legal_page_viewed` {page, source} | same | page privacy/terms→0/1; source sign_in/settings/footer/direct→0/1/2/3 |
| `blog_create_started` {source} | same | source create/write_your_own→click_loc 0/1 |
| `blog_quest_linked` {action link/remove} | `blog_editor_action` | action→3/7 |
| `blog_previewed` | `blog_editor_action` | action 5 |
| `blog_draft_saved` {photos} | same | photos→photo_count |
| `blog_published` {visibility, photos, has_quest, has_place} | same | visibility→0/1/2; photos→photo_count; has_*→has_*_flg |
| `blog_viewed` {signed_in, referrer, has_quest} | same | signed_in→signed_in_flg; referrer none/whatsapp/instagram/other→0/1/2/3; has_quest→has_quest_flg |
| `blog_quest_opened` | `blog_quest_click` | unchanged |
| `blog_read_end` | unchanged (Live) | |

No other v1 event was ever sent; main has no other call sites.

**DAU note (review #10).** Metrics' `COUNT(DISTINCT COALESCE(user_id, anon_id))` counts a person twice on the day they sign in. `events_clean` adds a column `person_id`: the `user_id`, else the `user_id` last seen with that `anon_id` (over all time, so a past day's count can shift when a device later signs in to another account), else the `anon_id`. The CTO should change that Metrics query to `COUNT(DISTINCT person_id)` in the sheet, then re-export (§14). The current query still runs unchanged.

### 5.4 Storage

None.

## 6. Frontend

There is no visible UI.

### 6.1 Screens

`lib/analytics/screens.ts`: `screenFor(template)` gives the screen, and `fromScreenFor(template)` gives the `from_screen` code (0–15), both from the public route template:

| Route template | `screen` | `from_screen` |
|---|---|---|
| `/home` | home | 0 |
| `/explore` | explore | 1 |
| `/quests` | quests | 2 |
| `/@[handle]`, `/@[handle]/followers`, `/@[handle]/following` | profile | 3 |
| `/@[handle]/[slug]` | quest_page | 4 |
| `/@[handle]/blog/[slug]` (new template, AN-03) | blog_page | 5 |
| `/settings`, `/settings/profile` | settings | 6 |
| `/notifications` | notifications | 7 |
| `/quests/new`, `/quests/[key]/arrange` | create_pick | 8 |
| `/quests/[key]/review` | create_review | 8 |
| `/quests/[key]/template` | create_template | 8 |
| `/quests/[key]/preview` | create_preview | 8 |
| `/quests/[key]/share`; `PublishSheet` while open | publish | 8 |
| `/create` | other | 10 |
| `/blogs/new`, `/blogs/[key]/edit` (new templates, AN-03) | blog_editor | 11 |
| `/guides/[slug]` | other | 12 |
| `/login` | other | 13 |
| `/onboarding`, `/welcome` | other | 14 |
| `/privacy`, `/terms` | other | 15 |
| `/` and anything else (`/quests/[key]/export`, `/blogs/[key]`, `/blogs/[key]/share`, `/demo`) | other | 9 |

**`screens.test.ts`** checks the routes users actually see (review #13):

1. Walk `app/` for `page.tsx`.
2. Strip route-group segments like `(public)` and `(signed-in)`.
3. Reverse the `next.config.ts` rewrites: `/u/[handle]` → `/@[handle]`, `/u/[handle]/{followers,following}` → `/@[handle]/…`, `/u/[handle]/[slug]` → `/@[handle]/[slug]`, `/b/[handle]/[slug]` → `/@[handle]/blog/[slug]`. The rewrites are read from the config, so a new rewrite breaks the test until it's mapped.
4. Assert every resulting public path maps through `routeTemplate` to a row above.

### 6.2 Firing rules

- **Views** fire once per mount, guarded with a `useRef`, after their data is known.
- **Clicks** fire in the handler. Navigation uses `sendBeacon`.
- **Leaving.** `quest_view_ended` and `quest_create_abandoned` fire on `pagehide` or `visibilitychange → hidden` (once per view), and on in-app exits.
- **Templates stay pure.** `QuestPlayer` gets an optional `onPageChange` prop and `MemorySheet` an optional `onAction` prop. The `features/trip-page` code sends the events. Templates import no analytics, and jitter and markup don't change.
- **Property builders** are pure functions with a unit test that uses `expectNoProblems`.
- **Owner views.** `quest_viewed` is sent with `is_owner_flg`. `blog_viewed` keeps skipping the writer, as today.

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| Don't log user text, emails or photo URLs | Yes, changed | Decision 0004. `user_info.email_id` is the only exception. It is attached on the server only (`userInfo.ts` is `server-only`), for the session's own user, behind the gate. Other properties are codes, counts, lengths, flags or keys |
| Identity can't be spoofed | Yes | `/ingest` and `trackServer` take identity only from `getUser()`. Browser merge events are dropped. Unparseable bodies are never forwarded (review #1) |
| Never store photo GPS / exact location | Yes | Counts only. Geo stops at city |
| Raw IP never stored | Yes | No `x-forwarded-for` upstream, `$geoip_disable`, PostHog "Discard client IP data" stays on, `ip` never selected. The CTO checks the history column (G1) |
| Secret keys server-only | Yes | `POSTHOG_PERSONAL_API_KEY` and `BIGQUERY_ERASER_KEY` are used only in `erasure.ts`. One set, in Vercel Production and Preview (shared project and dataset). The DELETE is scoped to the deleted key and its devices, so a Preview deletion (Preview's own Supabase keys) can't touch Production people |
| `getUser()` on the server | Yes | Bounded 60 s cache |
| No anonymous `select` / public reads via `get_*` | No change | |
| Unlisted URLs not leaked | Yes | Route templates only (blog template added). `?src=` is removed from the address bar. Referer is still dropped upstream |
| No per-person data in cached HTML | Yes | No server-set cookie at all now. `proxy.ts` is unchanged (review #16 is moot) |
| Notice before collection | Yes | `oq_actx` and `user_info` are both behind the policy gate (G3) |
| Access to personal data in BigQuery | Yes | `events_clean` has no email. `events_people` is founders-only |
| Account deletion removes everything | Yes, extended | §5.2, proved at G5/G6 |
| Analytics never fails an action | Yes | Errors swallowed and logged by name only |

### 7.1 CLAUDE.md line (the coordinator applies it after CTO approval)

Under "Security rules (do not break)", replace:

> - Don't log user text, emails or photo URLs.

with:

> - Don't log user text, emails or photo URLs. One exception: analytics `user_info` (username, email, city), attached on the server only and erased on account deletion (`docs/decisions/0004-user-info-and-email-in-analytics.md`).

Under "Add a new page or feature" step 5, change `lib/analytics.ts` to `lib/analytics/client.ts` (and `server.ts` for counts). Decision 0004 uses the same wording (review #14).

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content`, blog drafts | No shape change | An old draft without `startedAt` still sends `blog_published` (optional `minutes_since_start`; events never drop) | `blogEvents.test.ts` old-draft case |
| Migrations, archives, public functions | None | | |
| Public URLs, OG | `?src=` on in-app links | Optional and stripped | `src.test.ts` |
| Trip rendering | None | New template props are optional no-ops | Existing template tests |
| Server actions | `publishQuest.analytics` optional | Old bundles validate | Unit |
| PostHog event names | **Breaking** | One switch in AN-02. BigQuery history mapped. Insights repointed on deploy day (G4) | `renameMap.test.ts` |
| PostHog property types | **Breaking**: `platform` (STRING→INT64), `visibility` (`blog_published`), `referrer` (`blog_viewed`), `source` (`legal_page_viewed`, `content_liked`), `page` (`legal_page_viewed`), `action` (`blog_editor_action`), `option` (`create_option_click`) keep names but change type | The CTO resets these property definitions' types in PostHog on deploy day (G4) | |
| `ts` meaning | v1 browser rows have device time, v2 rows server time | `events_clean` sets `client_ts` for v1 rows and documents `ts` before the cut-over | Dry-run |
| Old tabs / rollback through `/ingest` | v1 names still arrive | Frozen v1 allowlist keeps their properties (§3.5) | `ingestEnrich.test.ts` v1 body |
| Env vars | New, all optional | Unset means today's behaviour, plus server-side identity | Unit |
| Rollback past AN-02 | The old release sends v1 names | `events_clean` and the frozen v1 allowlist handle both | |
| Rollback past AN-03 | The old `/ingest` forwards the client IP to PostHog again, and identity goes back to the browser | Only PostHog's "Discard client IP data" setting protects then; the CTO checks it is on before any rollback past AN-03. `user_info` isn't attached by the old code | |
| Rollback past AN-04 after `user_info` is on | Automatic erasure stops | Every account deletion until roll-forward needs the runbook's manual step (`docs/runbooks/analytics-erasure.md`); the cron log shows them | |

### 8.1 Deploy order and gates

| Gate | Before | Who | What |
|---|---|---|---|
| G1 | AN-01 merges | CTO | Follow the checklist in `docs/analytics/bigquery/apply-g1.sql`: report the `$` keys in history and where rows without `env` come from, run the fixture check (Part A), then apply and `bq query --dry_run` each object (Part B) and each Metrics query. Null `ip` once (162 rows) and report the `ip` / `$ip` counts. Once Preview has data with the cookie off (after AN-07 on Preview), run "Viewer → creator" and the `first_seen_ts` derivation on `events_clean_all` with `env = 'preview'` and confirm both are non-zero |
| G3 | `NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE=on` or `ANALYTICS_USER_INFO=on` in Production | Founder | Privacy policy update and in-app notice live (§14). `NEXT_PUBLIC_*` flags are inlined at build time: switching `NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE` needs a redeploy (`ANALYTICS_USER_INFO` is read at runtime) |
| G4 | AN-02 deploys | CTO | Export the list of PostHog insights and dashboards that use v1 names, paste it on AN-02's issue, and repoint them on deploy day. Reset the changed property types (§8 table) |
| G5 | AN-04 merges | CTO + builder | Preview proof against the **shared** PostHog project and `onquest_analytics` dataset (CTO, 26 Nov), with team test accounts. It relies on the DELETE being scoped to the deleted `user_id` and its devices (§5.2): Preview accounts live in Preview's Supabase project, so their keys never match a Production person, and device ids are per origin. Steps: sign in two team test accounts, A then B, in one browser. Delete A on Preview, then check (1) the PostHog person is gone via the API, (2) `SELECT COUNT(*) … WHERE user_id = @keyA OR distinct_id = @keyA` is 0 after the next cron run, (3) `deleted_users` has A's key and `deleted_devices` the shared `anon_id`, (4) B's signed-in rows on that `anon_id` are all still there, (5) `account_deleted` for A is still in `events_clean_all` (`env = 'preview'`), (6) the Production row count outside A's key and devices is unchanged. Record the result in the runbook |
| G6 | `ANALYTICS_USER_INFO=on` in Production | CTO | Same check in Production with a team test account. Record it in the runbook |

**Order:** G1 → AN-01 → AN-02 (with G4) → AN-03 (cookie off, `user_info` `off` in Production and `team` on Preview) → AN-04 (G5) → AN-05 … AN-13 in number order → AN-14 → G3 → cookie on → G6 → `ANALYTICS_USER_INFO=on`.

## 9. Performance and cost

- **Page speed.** No new client library. No effect on LCP.
- **`/ingest`.** Body parsing, plus at most one `getUser()` per access token per 60 s (bounded cache). Function time per ingest request rises slightly. That fits Hobby at friends-test volume.
- **PostHog.** About 3× more events. Production at around 450k events a month plus a little Preview traffic (one project) fits the 1M free tier.
- **BigQuery.** Views and two tiny tables. Erasure runs one DML script per deleted account per day for 30 days, each under 10 MB billed, so pennies. Preview rows share the dataset and are filtered out of the default views.
- No Supabase image transformations and no new paid service.

## 10. Analytics

Names, properties and codes are exactly `docs/analytics/v2/events.csv` and `codes.csv`. Counts come only from server events, sent after a successful write and only on a state change:

| Counted | Server event (source of truth) | Browser events never counted |
|---|---|---|
| Sign-ups / sign-ins | `user_signed_up`, `user_signed_in` | `sign_in_click` |
| Quests published / updated | `quest_creation_complete`, `quest_updated` | `preview_exit` action 1 |
| Drafts | `quest_draft_created` | `photos_selected` |
| Likes, comments, follows | `content_liked`, `comment_posted`, `comment_deleted`, `user_followed` | `comment_box_open` |
| Deletions, visibility, comments switch | `content_deleted`, `visibility_changed`, `comments_toggled`, `account_deleted` | `manage_menu_open`, `account_delete_click` |
| Notifications | `notification_sent` | `notification_click` |
| Blogs | `blog_draft_saved`, `blog_published`, `blog_updated` | `blog_create_started` |

AN-02 adds this row to `docs/analytics/change-log.csv`. "Tested" is filled in when E3 passes:

`2026-11-xx, "Analytics v2 (OQ-12, OQ-22, spec docs/specs/analytics-v2.md)", "Taxonomy v2 from docs/analytics/v2 replaces v1 (moved to docs/analytics/v1). Renamed: create_option_tapped→create_option_click; blog_managed→visibility_changed / comments_toggled / content_deleted / blog_updated; blog_deleted→content_deleted; blog_liked→content_liked; blog_comment_posted→comment_posted; blog_quest_linked, blog_previewed→blog_editor_action; blog_quest_opened→blog_quest_click; codes replace strings on legal_page_viewed, blog_create_started, blog_draft_saved, blog_published, blog_viewed. History mapped in BigQuery events_clean.", "Not yet"`

## 11. Test plan

**Unit tests (Vitest), next to each file:**

- **`taxonomy.test.ts`**:
  - stale check;
  - 72 events in the CSV (1 Live, 14 rename, 57 to build);
  - each parse case;
  - optional-list snapshot, with permanent and temporary entries labelled.
- **`taxonomyRules.test.ts`** (the taxonomy check):
  - every free STRING has a pattern;
  - `*_flg` properties are BOOL;
  - cited code lists exist in `codes.csv`;
  - counted events are type `server`;
  - every name passed to `track`/`trackServer` in `features/`, `app/` and `lib/` is in the taxonomy (source grep);
  - no v1 name is left outside `taxonomyV1.ts`, `renameMap.ts` and `ingestEnrich.ts`;
  - every temporary override names a task.
- **`metricsSql.test.ts`**: every event name and `'$.prop'` in `metrics.csv` exists in the taxonomy, or is a common column of `events_clean`.
- **`renameMap.test.ts`**: every mapped v2 property and value is valid.
- **`validate.test.ts`**:
  - patterns;
  - a key with a space, `@` or `http` is removed;
  - an email-shaped value in any property is removed;
  - **an event with a missing required property is still sent**;
  - `expectNoProblems` works.
- **`ingestEnrich.test.ts`**:
  - distinct id and `user_id` come from the session;
  - a body claiming another key is re-keyed;
  - no session and no valid anon_id → dropped;
  - browser `$identify`, `$create_alias` and `$merge_dangerously` dropped;
  - `/ingest` emits one `$identify` per new (anon, key) pair;
  - browser `user_info` overwritten;
  - gzip header, `compression` param, oversized and non-JSON bodies → 204, nothing forwarded;
  - no `x-forwarded-for` upstream;
  - v1 body keeps its v1 properties;
  - `env` set from the server's `VERCEL_ENV`, overwriting the browser's value.
- **Smaller modules**:
  - `userInfo.test.ts`: null when the session user ≠ the expected key; `off`/`team`/`on`; cache bound and expiry;
  - `common.test.ts`;
  - `screens.test.ts` (§6.1);
  - `userAgent.test.ts`;
  - `server.test.ts`: cookie off → null anon/session/screen and platform from UA; `notification_sent` and `account_deleted` shapes;
  - `erasure.test.ts`: request shapes, 404 = done, failures don't throw, the 30-day cron window, the built SQL stores device ids in `deleted_devices` and keeps another person's signed-in rows on a shared device;
  - `codes.test.ts`;
  - `src.test.ts`;
  - `blogEvents.test.ts`: old-shape draft (no `startedAt`) → `blog_published` sent with no `minutes_since_start`;
  - every property builder.
- **`privacy.test.ts`**:
  - blog route templates;
  - `client.ts` sends no `user_info`, `distinct_id` claim or `$identify`;
  - `userInfo.ts` and `erasure.ts` start with `import 'server-only'`.

**Other checks:**

- **Database access (`tests/db/`):** no change; the full suite must pass.
- **Backward compatibility:** v1 `/ingest` body; `publishQuest` without `analytics`; `QuestPlayer` without `onPageChange`; old blog draft.
- **AN-14, a manual gate, run by hand against a Vercel preview like `blogs.spec.ts` (review #6).** There is no CI e2e job: CI has no Supabase and Playwright isn't installed.
  - `tests/e2e/analytics.spec.ts` runs the flow sign in → create → publish → open the Quest signed out → turn pages → leave, with `/ingest` requests captured.
  - It asserts that every captured browser payload is a known v2 event with valid properties, and that `quest_viewed`, `quest_page_turn` and `quest_view_ended` fire in order.
  - It asserts that **no browser payload contains the test account's email or handle**. The `@` check is dropped, because route templates contain `@`.
  - It checks the shared PostHog project through its API for the same run, filtered on `env = preview`: `user_id` and `user_info` present on signed-in events (Preview is `team`, the test account's key is in `ANALYTICS_USER_INFO_TEAM_KEYS`), null when signed out.
  - The bot guard lets headless browsers through only when `NEXT_PUBLIC_ANALYTICS_E2E=1`. That is set on **Preview only** and inert when `NEXT_PUBLIC_VERCEL_ENV=production`; a unit test asserts this. It is inlined at build time, so set it and **redeploy the preview** before the run.
  - The run and its result are recorded on the AN-14 issue, the same way as `blogs.spec.ts`.
- **BigQuery:** gate G1.
- **Preview check per task (E1–E4):**
  - E1: signed-in events carry `user_id`, and `user_info` for team accounts; signed out, both are null.
  - E2: `screen` is right everywhere.
  - E3: the task's events fire once, with the sheet's properties.
  - E4: is G5.

## 12. Tasks

### 12.1 Ordering and merge rules

- **Strict order.** Tasks merge in number order: AN-01, then AN-02, and so on through AN-14. A task may start against the contract before the one ahead of it merges. It rebases on main before review and merges only after every lower number has merged.
- **Shared files.** These follow the merge order:

  | File | Tasks |
  |---|---|
  | `features/account/actions.ts` | AN-03, AN-04, AN-08, AN-11 |
  | `app/auth/{callback,confirm}/route.ts` | AN-08 only (AN-03 no longer touches them) |
  | `features/editor/publishActions.ts` | AN-06, AN-09 |
  | `features/quests/ManageQuestSheet.tsx` | AN-07, AN-10 |
  | `features/account/SettingsView.tsx` | AN-12, AN-13 |
  | `features/home/{FeedCard,BlogFeedCard}.tsx`, `features/blogs/BlogList.tsx` | AN-05 (`?src=`), AN-10 (share) |
  | `features/blog-editor/{LinkQuestRow,NewBlogView}.tsx` | AN-02, AN-13 |
  | `features/blogs/ManageBlogSheet.tsx` | AN-02, AN-10 |
| `features/blogs/LiveBlogSocialProvider.tsx` | AN-02, AN-13 |
| `features/blogs/{socialActions,actions,blogEvents}.ts`, `features/blog-editor/actions.ts` | AN-02, AN-09 |
  | `.env.example` | AN-03, AN-04 |

- **`lib/analytics/codes.ts`** has one section per task, headed `// AN-xx`. Tasks only append. A task that needs an earlier task's mapping imports it and doesn't edit it.
- **`OPTIONAL_OVERRIDES`.** A task removes only its own temporary entries and regenerates `taxonomy.ts`.

### 12.2 Tasks

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| AN-01 | backend | v2 generator, validation, rules and BigQuery SQL (no call-site change) | `lib/analytics/{taxonomyFromCsv,generate,validate,renameMap}.ts`, generated `taxonomyV2.ts`; tests `taxonomy`, `taxonomyRules` (v2 part), `metricsSql`, `renameMap`, `validate`; `docs/analytics/bigquery/{events_clean,events_people,events_clean_all,events_people_all,deleted_users,deleted_devices}.sql`; `docs/analytics/README.md` | AC7, AC10, AC14 | G1 (before merge) | `npm run analytics` writes `taxonomyV2.ts` from v2. Validation removes bad properties but never drops an event. The SQL is committed and G1 has passed (CTO comment on the PR) |
| AN-02 | backend | Rename the 14 live events | `taxonomyV2.ts` → `taxonomy.ts`; old file frozen as `taxonomyV1.ts`; v1 CSVs → `docs/analytics/v1/`; `lib/analytics/codes.ts` (AN-02 section); `features/shell/{CreateChooser.tsx,CreateChooser.test.ts}`; `features/blog-editor/{NewBlogView,LinkQuestRow,BlogComposer,actions,shouldTrackDraftSave}.ts(x)`, `deleteBlogDraft.test.ts`; `features/blogs/{actions,socialActions,blogEvents,blogEvents.test,readerEvents,blogReferrer,LiveBlogSocialProvider,LinkedQuestCard,BlogPageArticle,ManageBlogSheet}.ts(x)`; `features/legal/LegalViewed.tsx`; `tests/e2e/blogs.spec.ts`; `docs/analytics/change-log.csv` | AC8 | AN-01, G4 | All 14 send v2 names. Each required property is filled from the §4.1 "AN-02 fills these itself" table, or is a temporary override. The old-draft test passes. No v1 name is left in code. Change-log row added. G4 list is on the issue |
| AN-03 | backend | Identity, common properties, screens, `user_info`, `app_opened` | `lib/analytics/{client,server,common,ids,screens,userAgent,userInfo,src,routeTemplate,ingestProxy,ingestEnrich,codes}.ts`, `Pageviews.tsx` and tests; `app/ingest/[...path]/route.ts`; `features/editor/PublishSheet.tsx` (setScreen only); `.env.example`; removes the `from_screen` override | AC1–AC3, AC5, AC6, `app_opened` | AN-02 | All §11 `ingestEnrich`, `userInfo`, `screens` and `server` tests pass. The cookie is behind its flag. `user_info` is behind `off`/`team`/`on`. `app_opened` fires once per new session. E1 and E2 pass on Preview |
| AN-04 | backend | Analytics erasure and `account_deleted` | `lib/analytics/erasure.ts` and test; `features/account/{accountDeletion,actions}.ts` (`account_deleted` + erasure); `app/api/cron/finish-deletions/route.ts`; `docs/runbooks/analytics-erasure.md`; `.env.example` | AC12, `account_deleted` | AN-03, G5 (before merge) | `account_deleted` is sent with a `deleted_` distinct id and null anon/session/`user_info`. Erasure runs from deletion and from the cron for 30 days. G5 proof recorded in the runbook |
| AN-05 | frontend | Quest page events | `features/trip-page/{LiveSocialProvider,TripView,QuestFullscreen,QuestUnavailable,UnavailableActions}.tsx` and builders; `templates/shared/{QuestPlayer,MemorySheet}.tsx` (optional callbacks); `features/shell/SiteFooter.tsx`; `?src=` on Quest links in `features/{home,explore,profile,quests,notifications,blogs,guides}/` cards; `codes.ts` (AN-05) | `quest_viewed`, `quest_unavailable`, `quest_page_turn`, `quest_fullscreen`, `quest_photo_click`, `quest_view_ended`, `report_click` | AN-04 | 7 events pass E3. Templates import no analytics |
| AN-06 | backend | Create flow server events | `features/editor/{actions,arrangeActions,publishActions}.ts` (+ `publishQuest.analytics`), builders and tests; `codes.ts` (AN-06) | `quest_draft_created`, `quest_arranged`, `quest_creation_complete`, `quest_updated` | AN-05 | Sent after successful writes. Old publish input still valid |
| AN-07 | frontend | Create flow client events | the `/quests/new` links listed in the sheet (adds the missing `?source=`); `features/editor/{NewQuestView,usePickPhotos,ReviewPages,PageCard,ChooseTemplate,PreviewQuest,EditorDraft,draftStore}.ts(x)`; `features/quests/{QuestTile,ManageQuestSheet}.tsx`; `features/blogs/ManageDraftSheet.tsx`; builders and tests; `codes.ts` (AN-07) | `create_quest_click`, `photos_selected`, `photo_limit_hit`, `quest_edit`, `template_select`, `quest_preview`, `preview_exit`, `draft_resumed`, `quest_create_abandoned`; sends `publishQuest.analytics` | AN-06 | 9 events pass E3 |
| AN-08 | backend (single builder) | Sign up, sign in, username, welcome | `app/auth/{callback,confirm}/route.ts`; `lib/auth/next.ts`; `features/account/{actions,LoginForm,SignInSheet,HandleForm,EditProfileForm,Welcome}.ts(x)`; builders and tests; `codes.ts` (AN-08) | `sign_in_click`, `user_signed_up`, `user_signed_in`, `username_set`, `username_rejected`, `welcome_step_viewed`, `welcome_click` | AN-07 | 7 events pass E3 |
| AN-09 | backend | Social, notifications, manage and blog server extras | `features/trip-page/actions.ts`; `features/blogs/{socialActions,actions,blogEvents}.ts`; `features/blog-editor/actions.ts`; `features/profile/actions.ts`; `lib/email/{notify,notifyServer}.ts` (+ `?src=email`); `features/editor/publishActions.ts` (visibility, comments, delete); builders and tests; `codes.ts` (AN-09); removes its overrides | Quest halves of `content_liked`, `comment_posted`, `visibility_changed`, `comments_toggled`, `content_deleted`; `comment_deleted`, `user_followed`, `notification_sent`; the blog properties in §4.1 owned by AN-09 | AN-08 | Sent only on a state change. `notification_sent` shape right. Overrides removed |
| AN-10 | frontend | Share, export, comment box, notification clicks, manage menu | `features/editor/ShareScreen.tsx`, `features/blog-editor/BlogShareScreen.tsx`, `features/home/{FeedCard,BlogFeedCard}.tsx`, `features/quests/ManageQuestSheet.tsx`, `features/blogs/{ManageBlogSheet,BlogTopBar,BlogList}.tsx`, `features/shell/{ShareLinkButton,AppHeader}.tsx`, `features/profile/ProfileHeader.tsx`, `features/export/ExportScreen.tsx`, `features/trip-page/{CommentComposer,QuestTopBar}.tsx`, `features/notifications/NotificationsView.tsx`; builders and tests; `codes.ts` (AN-10) | `share_click`, `instagram_export`, `comment_box_open`, `notification_click`, `manage_menu_open` | AN-09 | 5 events pass E3 |
| AN-11 | backend | Profile, settings, sign-out server events | `features/account/actions.ts` (saveProfile, saveSettings, signOut), `app/email/unsubscribe/route.ts`; builders and tests; `codes.ts` (AN-11) | `profile_updated`, `setting_changed`, `user_signed_out` | AN-10 | 3 events pass E3. The unsubscribe route sends `user_info: null` (no session) |
| AN-12 | frontend | Navigation, Home, Explore, search, guides | `features/shell/AppBottomBar.tsx`, `features/home/{HomeView,HomeFeed,HomeBanner,WhatIsAQuestSheet}.tsx`, `features/account/SettingsView.tsx` (whats_a_quest), `features/explore/ExploreView.tsx`, `features/guides/GuideView.tsx`; builders and tests; `codes.ts` (AN-12) | `tab_click`, `home_viewed`, `feed_load_more_click`, `whats_a_quest_click`, `explore_viewed`, `search`, `search_result_click`, `guide_viewed` | AN-11 | 8 events pass E3 |
| AN-13 | frontend | Profile, settings, errors, blog extras | `features/profile/{ProfileView,ProfileSections,FollowsView}.tsx`, `features/quests/YourQuestsView.tsx`, `features/account/{SettingsView,DeleteAccountDialog}.tsx`, the sheet's `error_shown` locations, `features/blog-editor/{FormatToolbar,useBodyFormatting,PhotoRow,PlaceRow,ComposerTopBar,LinkQuestRow,NewBlogView}.ts(x)`, `features/blogs/{BlogUnavailable,LiveBlogSocialProvider}.tsx` (read_time_min); builders and tests; `codes.ts` (AN-13); removes its overrides | `profile_viewed`, `profile_tab_click`, `follow_list_viewed`, `settings_viewed`, `feedback_click`, `account_delete_click`, `error_shown`, `blog_format_click`, `blog_unavailable`; the other `blog_editor_action` actions; `blog_create_started` click_loc 2 | AN-12 | Events pass E3. No temporary override left |
| AN-14 | frontend | End-to-end analytics gate (manual, Preview) | `tests/e2e/analytics.spec.ts`, `tests/e2e/playwright.config.ts` (comment), `lib/analytics/bots.ts` (Preview-only override) and test | AC9, AC10 | AN-13 | `NEXT_PUBLIC_ANALYTICS_E2E=1` set on Preview and the preview redeployed (build-time flag). Run by hand on that preview. Result posted on the issue. Assertions as in §11 |

## 13. Decisions

| # | Decision | Options considered | Choice | Reason | Needs CTO sign-off? |
|---|---|---|---|---|---|
| D1 | Where `user_info` is attached | browser; server (`/ingest`, `trackServer`); BigQuery join | Server, for the session's own user only | Email never reaches the browser. One trust boundary | **Yes** (decision 0004) |
| D2 | Who decides identity and merges anon → user | `oq_uid` cookie + browser `identify()`; `/ingest` sets `distinct_id` and emits `$identify` | `/ingest` (revised) | A browser-set id can file events under someone else (review #1) | **Yes** (changes the brief's "call identify()" into one server-side identify) |
| D3 | anon/session/screen on server events | cookie `oq_actx`; field on every action | Cookie, behind its own flag until the policy is live | No change to action schemas. Holding the cookie back meets the founder gate (review #4) | No |
| D4 | os / browser | parse UA in code; BigQuery mapping | Code | Testable; same on both senders | No |
| D5 | `is_internal_flg` | handles; user keys; none | **None** (CTO decision, 26 Nov 2026) | No internal-account marking; Metrics don't filter team accounts | Decided by the CTO |
| D6 | Required properties | all required; none required; conditional + overrides | Conditional + permanent/temporary overrides, and **never drop an event** (revised) | Renamed and counted events can't silently disappear (review #2) | No |
| D7 | `first_seen_ts`, `days_since_last_sign_in` | send; derive in `events_clean` | Derive | The previous sign-in time isn't available at the callback | **Yes** (deviates from the sheet) |
| D8 | `click_loc` at publish | store in the draft; browser passes it | Browser passes it | No stored-shape change | No |
| D9 | BigQuery erasure | automated DELETE; manual only; scheduled query | Automated + 30-day re-run + `deleted_users` anti-join, with a manual fallback | Deletion happens without a human. Backfills can't resurrect rows | **Yes** (one GCP service account and key, used by Production and Preview) |
| D10 | Raw IP to PostHog | keep; stop | Stop | "Never the raw IP" | No |
| D11 | `user_info` on `notification_sent` | recipient's; null | Null | No request from the recipient; one copy fewer | No |
| D12 | Session check in `/ingest` | per event; cached `getUser()`; `getClaims()` | Cached `getUser()`, LRU 1,000, 60 s | CLAUDE.md rule, bounded cost | No |
| D13 | Old CSVs and old taxonomy | delete; move + freeze | Move to `docs/analytics/v1/`, freeze `taxonomyV1.ts` for 30 days | Old tabs and rollback keep their properties (review #9d) | No |
| D14 | Top-level `country` | move into `user_info.geoip` only (common.csv); keep top-level too | Keep top-level too | Signed-out events would otherwise have no geo at all. Deliberate deviation from common.csv (review #15) | **Yes** (deviates from the sheet) |
| D15 | Preview analytics | separate Preview project and dataset; one shared project and dataset with an `env` property | **Shared, with `env`** (CTO decision, 26 Nov 2026). `ANALYTICS_USER_INFO=team` on Preview; default views filter to `production` | One setup and one set of credentials. Testers' emails still never reach analytics (team-only), and G5 proves erasure on Preview through the key-scoped DELETE | Decided by the CTO |
| D16 | Personal data in BigQuery views | one view; `events_clean` without email + founders-only `events_people` | Two views | Metrics readers never see emails (review #10d) | No |

## 14. Risks and open questions

**Technical, for the CTO:**

- Gates G1, G4, G5 and G6 (§8.1). (G2 removed with internal marking.)
- Sign-off on D1, D2, D7, D9 and D14 (D15 decided 26 Nov).
- Credentials: one PostHog personal API key with `person:write` and one GCP service account `analytics-eraser`, set in Vercel Production and Preview. No Preview project, dataset or keys.
- Change the DAU query in the sheet's Metrics tab to `COUNT(DISTINCT person_id)` and re-export `metrics.csv` (§5.3).
- **PostHog's `bulk_delete` contract and deletion timing are unverified here.** AN-04 confirms them, and G5 proves them.
- The BigQuery DELETE can collide with an export load job. The daily re-run covers it.
- **Expired sessions.** `/ingest` doesn't refresh sessions. A signed-in person whose access token expired while on a public page is treated as signed out (anon distinct id) until they open an app route. PostHog still has the earlier merge, so their events join up. The share is measured on Preview (E1).
- After `user_info` is on, never roll back past AN-03 (§8).

- **Sheet mismatch, for the CTO:** `app_opened.landing_page` is `0 – 6` in `events.csv`, but `codes.csv` has `7 = Other (suggested)`. The build follows `events.csv`. Settle it in the sheet and re-export before AN-03 sends `app_opened`.

**Product, for the founder** (review founder #1–#3):

1. **Policy timing.** The spec assumes **AN-03 holds the new cookie (`oq_actx`) and `user_info` back until the policy is live**. Tell us if you'd rather publish the policy before AN-03 deploys.
2. **Policy text.**
   - "What we collect": analytics include your email, username and city when signed in, and still no IP address.
   - "Cookies and storage": one small first-party analytics cookie with a random device and visit id.
   - "Services": add Google Cloud (BigQuery) next to PostHog.
   - Deletion: analytics are deleted "within 30 days" of deleting the account.
   - The in-app notice before it applies.
   - OK with "within 30 days"?
3. **Plain email.** Do you agree with plain email, not hashed, in PostHog (US host) and BigQuery, given decision 0004's reasons? Plus the short DPDP legal check before public launch.

## 15. Later

- Remove `taxonomyV1.ts` and the v1 branch in `/ingest` 30 days after AN-02 deploys (contract step).
- A Required column in the taxonomy sheet.
- Move count dashboards from PostHog to BigQuery entirely.
- `sign_in_click.source` split of code 3 (sheet comment; not approved).
- Automatic check that the sheet and the CSVs match.
- A CI e2e job, once CI has a Supabase project and Playwright is installed.
