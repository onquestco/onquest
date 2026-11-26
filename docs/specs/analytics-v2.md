# Spec: Analytics taxonomy v2

| | |
|---|---|
| PRD | `docs/prds/2026-11-analytics-v2.md` (CTO brief, 26 Nov 2026) + `docs/analytics/v2/{events,common,codes,metrics}.csv` (export of the Google Sheet "OnQuest Taxonomy v2 (from code)", approved by the CTO) |
| Status | Draft |
| Build mode | Backend + Frontend split, 13 tasks (AN-01 … AN-13); backend lands first in each group |
| Tracker IDs | OQ-12, OQ-22 · AN-01 #50, AN-02 #51, AN-03 #52, AN-04 #53, AN-05 #54, AN-06 #55, AN-07 #56, AN-08 #57, AN-09 #58, AN-10 #59, AN-11 #60, AN-12 #61, AN-13 #62 (label `spec:analytics-v2`) |

**Readiness.** The CSVs give every event, property, allowed value, firing rule, code location and metric; the brief gives the order, the rules and the CTO decisions. There is no user-facing UI, so empty/loading/error states don't apply (analytics never shows anything and never fails an action); the UX test plan is replaced by an event check on the Vercel preview (§11). Technical gaps the sheet leaves open (which properties are required, how browser events get `user_info`, how server events get `anon_id`/`session_id`, two properties that can't be measured at send time) are decided in §13. Nothing blocks the build. **One gate before `user_info` turns on in production:** the founder's privacy policy update (§14).

**No database migration.** Nothing in this spec adds or changes a table, function, grant or RLS policy. Erasure reads `deleted_accounts` through the admin client (already granted `select` to `service_role`). BigQuery gets two views (`events_clean`, `internal_users`) applied by hand (§5.3).

**Not done by this PR, for the CTO:** the CLAUDE.md line (§7.1). Agents don't edit CLAUDE.md; apply it on this PR before merging.

## 1. Summary

Nothing changes for users except one privacy-policy update. Under the hood, `lib/analytics/taxonomy.ts` is regenerated from the v2 CSVs (72 events, typed codes instead of strings), every event gets the v2 common properties (user key, anon/session ids on server events too, screen, platform/os/browser, internal and bot flags) and a server-attached `user_info` (geo, username, email; decision 0004), the 14 live events are renamed in one step with a BigQuery view that maps their history to the new names, and the 57 new events are wired screen by screen in the sheet's order. Account deletion now also deletes the person's PostHog data and BigQuery rows.

## 2. Acceptance criteria map

| Brief / sheet criterion | Satisfied by | Proved by |
|---|---|---|
| AC1 `identify()` called everywhere: every signed-in browser event has the user key | `oq_uid` cookie set by `proxy.ts` and the auth routes, read by `client.ts` (`identify()` on change, `forgetUser()` when gone); `/ingest` sets `user_id` from the verified session (§3.2) | `client.test.ts` identify/forget; `ingestEnrich.test.ts` user_id from session, spoofed key replaced; preview check E1 |
| AC2 `setScreen()` everywhere: no `unknown` / `server` screen | `screenFor(routeTemplate)` in `Pageviews.tsx` on every route change; `PublishSheet` sets `publish`; server events read the screen from `oq_actx` | `screens.test.ts` every route in `app/` maps to a listed screen; E2 |
| AC3 common properties per `common.csv` on every event | `lib/analytics/common.ts` (one shape for browser and server); `oq_actx` cookie carries anon/session/screen/platform to server events | `common.test.ts` (every common.csv row present, types right); `server.test.ts` |
| AC4 `is_internal_flg` for @swativb, @alok18, @quest | `lib/analytics/internal.ts` (`INTERNAL_HANDLES`), applied where `user_info.username` is known; BigQuery `internal_users` view | `internal.test.ts`; Metrics query 1 dry-run |
| AC5 `is_bot_flg` | Browser drops bots (unchanged); `/ingest` and `trackServer` set the flag from the user agent; `events_clean` excludes `true` | `privacy.test.ts` isBot; `ingestEnrich.test.ts` |
| AC6 `user_info` {geoip country/region/city, username, email_id}, null signed out, never the raw IP | `lib/analytics/userInfo.ts`, attached by `/ingest` and `trackServer` only, behind `ANALYTICS_USER_INFO=on` | `userInfo.test.ts`; `ingestEnrich.test.ts` (browser-sent user_info overwritten, no `x-forwarded-for` upstream); `privacy.test.ts` (no email in client bundle code paths) |
| AC7 generated `taxonomy.ts` from the v2 CSVs replaces the old one; script kept | `taxonomyFromCsv.ts` v2 reader, `generate.ts` (`npm run analytics`) | `taxonomy.test.ts` (stale check, 72 events, parse rules); **taxonomy check test** `taxonomyRules.test.ts` (§11) |
| AC8 14 live events renamed, blog_* keep working, change log | AN-01 renames every call site in one PR; `docs/analytics/bigquery/events_clean.sql` maps old names and values to v2; row in `docs/analytics/change-log.csv` | `taxonomy.test.ts` no old name in `features/`; `renameMap.test.ts` (each old → new mapping valid against the taxonomy); Metrics "Blog adoption" and "Blog read-through" dry-run over history |
| AC9 57 To-build events wired, in the sheet's order | AN-04 … AN-12 (§12), each event at the sheet's code location | Per-task unit tests of the property builders; E3 preview checks; AN-13 Playwright |
| AC10 no user text in properties (lengths, counts), email_id the only exception | Generated rules: free STRING properties only for keys and an allowlisted few, with strict patterns (§4.1); `user_info` attached on the server only | `taxonomyRules.test.ts`; `validate.test.ts` (spaces/URLs/emails in a key property rejected) |
| AC11 server events are the source of truth for counts | Every counted thing (sign-ups, publishes, likes, comments, follows, deletes, notifications) is a `server` event sent after the database write succeeds; browser events never duplicate them | §10 table; `taxonomyRules.test.ts` (every Metric "count" event is type server) |
| AC12 account deletion removes the user's analytics | `lib/analytics/erasure.ts` (PostHog bulk delete + BigQuery DELETE), called from `deleteAccount()` and re-run by the daily cron for 7 days; manual runbook | `erasure.test.ts` (requests built right, failures don't stop deletion); `accountDelete.test.ts` unchanged; runbook |
| AC13 CLAUDE.md rule, decision record, privacy-policy flag | Decision `0004`; §7.1 line for the CTO; §14 founder item | Review |
| AC14 Metrics tab queries stay valid | `events_clean` exposes the columns the queries use; `metricsSql.test.ts` checks every event name and `$.property` in `metrics.csv` exists in the taxonomy; dry-run step in the runbook | `metricsSql.test.ts`; `bq query --dry_run` (§11) |
| AC15 tests per CLAUDE.md | Vitest next to each file; no RLS change so no new `tests/db/` file, existing `accountDelete.test.ts` must still pass | CI |

## 3. Approach

### 3.1 Taxonomy as code

`npm run analytics` reads `docs/analytics/v2/events.csv` and writes `lib/analytics/taxonomy.ts`: one `EVENTS` object keyed by event name with its `type` (`click` / `view` / `client` / `server`), who it's about (`user`: `signed_in` / `optional` / `other_user`, from the `user_id` column) and its property rules. `click`, `view` and `client` events are sent from the browser with `track()`; `server` events with `trackServer()`. TypeScript names come from the file, so calling `track()` with a server event, an old name or a wrong property is a type error, and a bad value is dropped at runtime (as today). The old CSVs move to `docs/analytics/v1/` for history; `change-log.csv` stays where it is.

### 3.2 Who and where (identify, user_info, geo)

```
browser track() ──► /ingest (our route handler) ──► PostHog ──hourly──► BigQuery events
   common props        + user_id (verified session)                       └─ events_clean view
   no user_info        + user_info (flag on), is_internal_flg, is_bot_flg,
                         os/browser, country; drops IP; $geoip_disable
server action / auth route ──► trackServer() ── same enrichment from the request ──► PostHog
```

- **identify().** `proxy.ts` already calls `getUser()` on app routes; it also sets a cookie `oq_uid=<user key>` (or deletes it when signed out). The auth callback/confirm routes set it, `signOut` and `deleteMyAccount` delete it. `client.ts` reads it before each send: a new key → `identify(key)` (one `$identify` merging the anon id), no cookie → `forgetUser()`. The user key is a random UUID already in public API paths; no name, handle or email is in the cookie.
- **The `/ingest` handler is the trust boundary.** It parses the body (single event or `batch`), and on each event: sets `user_id` from `supabase.auth.getUser()` on the request's session (null if none; a browser-claimed key that doesn't match is replaced), sets `user_info` (or null), `country` from `x-vercel-ip-country`, `os`/`browser` from the user agent, `is_bot_flg`, `is_internal_flg`, `$geoip_disable: true`; strips anything else not in the allowlist; then forwards **without** `x-forwarded-for`. The session lookup is cached per server instance for 60 s, keyed by a SHA-256 of the access token, so a burst of events costs one auth call.
- **Server events** read the same context from the request: `cookies()` for `oq_actx` (anon_id, session_id, screen, platform) and the session, `headers()` for geo and user agent. `after()` in server actions and route handlers can read both.
- **Geo:** Vercel headers only (country, region, URL-decoded city). Signed-out events keep the top-level `country` (as today); region and city exist only inside `user_info`.

### 3.3 Renames without a gap (AN-01)

All 14 renamed events switch in the same PR that regenerates the taxonomy, so there is no release where a blog event isn't sent. Old rows in BigQuery keep their old names and string values; `events_clean` maps them to the v2 name and codes (§5.3), so every Metrics query reads one continuous series. The quest halves of the merged events (`visibility_changed`, `comments_toggled`, `content_deleted`, `content_liked`, `comment_posted`) are new sends and land with their groups (AN-08).

### 3.4 Order of the 57 new events

Foundations (AN-01 … AN-03), then the sheet's Summary order: Quest view (AN-04), create (AN-05/06), sign-in (AN-07), share/social/notifications (AN-08/09), everything else (AN-10 … AN-12), then the end-to-end check (AN-13). Each task wires the events at the sheet's "Code location" and tags the in-app links its screens own with `?src=` (§4.4).

## 4. Contract

### 4.1 Taxonomy (`lib/analytics/taxonomyFromCsv.ts` → generated `taxonomy.ts`)

```ts
export type EventType = 'click' | 'view' | 'client' | 'server';
export type PropertyType = 'STRING' | 'BOOL' | 'INT64' | 'FLOAT64' | 'TIMESTAMP';
export type PropertyRule = {
  type: PropertyType;
  required: boolean;
  values?: (string | number)[];   // "0 / 1 / 2" → [0, 1, 2] (INT64); "google / email_link" (STRING)
  list?: string[];                // comma lists: fields_changed, change_types
  min?: number; max?: number;     // "0 – 6", "3–20"; "2–" → min only
  pattern?: 'key' | 'town' | 'utm';  // free STRINGs, see below
};
export type EventRule = {
  type: EventType;
  user: 'signed_in' | 'optional' | 'other_user'; // "user_id" / "user_id (empty when signed out)" / "(person notified)"
  properties: Record<string, PropertyRule>;
};
export const EVENTS = { /* generated, sorted */ } as const satisfies Record<string, EventRule>;
export type BrowserEventName = /* names with type click | view | client */;
export type ServerEventName  = /* names with type server */;
export type EventProps<Name extends keyof typeof EVENTS> = /* typed from the rules */;
```

Parse rules (each covered by `taxonomy.test.ts`):

- Rows with an empty `name` are more properties of the event above; section rows (area only) and `(common props only)` are skipped. Columns are found by header name (`area,name,user_id,anon_id,session_id,type,ts,properties [JSON key],Data type,Allowed values,Property description,Fires when,Status,…`).
- **Required:** a property is required unless its description or allowed values mention `null`, `if any`, `only` (e.g. "Caption edits only", "Quests tab only"), `reserved`, or it is in `OPTIONAL_OVERRIDES` = `referrer_quest_id`, `referrer_blog_id`, `referrer_owner_user_id`, `utm_source`, `attempt`, `first_seen_ts`, `days_since_last_sign_in`, `from_visibility`. The test snapshots the optional list, so a sheet edit that changes it shows in review. (Later: a Required column in the sheet.)
- **Free STRINGs** (no allowed values) are allowed only as: keys (`*_id`, `content_id`, `view_id`) → `pattern: 'key'` = `^[a-z0-9_-]{1,64}$`i (UUIDs, `anon_…`, guide slugs); `chip_name` → `'town'` = `^[\p{L}\p{M} .'-]{1,60}$`u; `utm_source` → `'utm'` = lowercased, `^[a-z0-9_.-]{1,40}$`, anything else is sent as `other`. Overrides for the two unparseable cells: `change_types` = list of `0…11`, `fields_changed` = list `name,username,photo,city,bio`. **Any other free STRING fails the generator** (that's the taxonomy check for "no user text").
- `TIMESTAMP` values are ISO-8601 strings with offset.
- `first_seen_ts` and `days_since_last_sign_in` are in the taxonomy but **derived in `events_clean`**, never sent (§13 D7).

### 4.2 Sending (`lib/analytics/client.ts`, `server.ts`, `common.ts`)

```ts
// Browser. Unchanged names; typed by the generated file.
track<Name extends BrowserEventName>(event: Name, properties: EventProps<Name>): void;
setScreen(screen: Screen): void;              // Screen = the 15 common.csv values
identify(userKey: string): void;              // called by client.ts itself from oq_uid; exported for tests
forgetUser(): void;
trackPageview(pathname: string): void;        // + setScreen(screenFor(routeTemplate(pathname)))

// Server. Same signature as today, so existing call sites only change names/props.
trackServer<Name extends ServerEventName>(
  event: Name,
  userKey: string | null,                     // event's user_id; recipient for notification_sent
  properties: EventProps<Name>,
): Promise<void>;
```

Common properties on every event (`common.ts`, from `common.csv`):

| Property | Browser event | Server event |
|---|---|---|
| `event_id` | `crypto.randomUUID()` | same |
| `type` | the event's type from the taxonomy | `server` |
| `user_id` | set by `/ingest` from the session | `userKey` argument |
| `anon_id`, `session_id` | `ids.ts` (unchanged) | from `oq_actx`; `null` for `notification_sent` (sheet) and when the cookie is missing |
| `client_ts` | device time, ISO | absent |
| `platform` | `0` mobile (pointer: coarse) / `1` desktop | from `oq_actx` |
| `os`, `browser` | set by `/ingest` from the user agent (`lib/analytics/userAgent.ts`) | same function on the request's user agent |
| `app_version` | short SHA (unchanged) | same |
| `screen` | current screen (§6.1) | from `oq_actx` |
| `country` | `/ingest`, `x-vercel-ip-country` | request header |
| `is_internal_flg` | `/ingest`: `user_info.username` in `INTERNAL_HANDLES` | same |
| `is_bot_flg` | `/ingest`: `isBot(user-agent)` | same |
| `user_info` | `/ingest` (flag on, signed in) else `null` | same; `null` for `notification_sent` |

`oq_actx` cookie: `v1.<anon_id>.<session_id>.<screen>.<platform>`, written by `client.ts` on every send and page view, `Path=/; SameSite=Lax; Max-Age=1800`, not httpOnly. The server accepts it only if it matches `^v1\.anon_[0-9a-f-]{36}\.[0-9a-f-]{36}\.[a-z_]{2,20}\.[01]$`, otherwise treats it as missing. `oq_uid` cookie: a UUID, `Path=/; SameSite=Lax; Max-Age=34560000`, not httpOnly.

PostHog `timestamp` is **not** sent by the browser, so PostHog stamps server time (the sheet's `ts = server_ts`); `client_ts` keeps the device time. Server events send `timestamp` = now.

`user_info` (`lib/analytics/userInfo.ts`):

```ts
export const UserInfoSchema = z.object({
  geoip: z.object({ country: z.string().regex(/^[A-Z]{2}$/).nullable(),
                    region: z.string().max(10).nullable(), city: z.string().max(80).nullable() }).nullable(),
  username: z.string().max(20).nullable(),   // profiles.handle; null before onboarding
  email_id: z.string().max(320).nullable(),  // auth user email; null for phone/none
}).nullable();
export async function userInfoForRequest(userKey: string): Promise<UserInfo>; // null unless ANALYTICS_USER_INFO=on
```

### 4.3 Server actions

No new actions. Changed inputs (additive, optional, so old browsers keep working):

| Action | Input change | Used for | Task |
|---|---|---|---|
| `publishQuest` (`features/editor/publishActions.ts`) | `+ analytics?: { clickLoc?: int 0–10, editCount?: int ≥ 0, changeTypes?: int[] (0–11, unique) }` | `quest_creation_complete.click_loc/edit_count`, `quest_updated.change_types` | AN-05 (schema), AN-06 (sends it) |
| `setLike`, `setFollow`, `setBlogLike` | `source` already arrives; mapped to the v2 code | `content_liked.source`, `user_followed.source` | AN-01 / AN-08 |
| `createQuest` | `source` already arrives (`QuestCreateSourceSchema`); mapped to `click_loc` | `quest_draft_created.click_loc` | AN-05 |
| `reportCreateProgress` | unchanged input; now sends `quest_arranged` | | AN-05 |

The `?source=` values in `/quests/new` links and `lib/analytics/sources.ts` stay strings (they are in links people have); `lib/analytics/codes.ts` maps them, and every other internal enum, to the v2 codes. `codes.test.ts` checks each mapped number exists for that list in `codes.csv`.

### 4.4 Routes and link tags

- `app/ingest/[...path]/route.ts`: same paths, now enriches the body (§3.2). Bodies over 64 KB, or that don't parse, are forwarded unchanged **minus** IP, and `user_info`/`user_id` set to null (never fail open with a browser-supplied identity).
- `?src=<code>` on in-app links to Quests and blogs (`quest_viewed.source`, `blog_viewed.source`, `profile_viewed.source`, `guide_viewed.source`), built with `withSrc(href, code)` in `lib/analytics/src.ts` and read once on the page, then removed from the address bar with `history.replaceState` so a copied link doesn't carry it. Cached public pages ignore query strings for rendering, so `?src=` doesn't fragment the cache.
- `?src=email` on notification email links (`lib/email/notify.ts`, AN-08) for `app_opened.entry_type = 2` and `notification_click.channel = 1`.
- No new pages, no metadata or sitemap change.

## 5. Database and storage

### 5.1 Postgres

None. No table, function, grant or policy changes, so no `tests/db/` additions; `accountDelete.test.ts` must still pass. No in-place updates are involved: analytics writes go to PostHog, not Postgres.

### 5.2 Erasure on account deletion (AN-03)

`lib/analytics/erasure.ts` (`import 'server-only'`):

```ts
export async function eraseAnalytics(userKey: string): Promise<{ posthog: 'done' | 'skipped' | 'failed'; bigquery: 'done' | 'skipped' | 'failed' }>;
```

1. **PostHog:** `POST https://{POSTHOG_API_HOST}/api/projects/{POSTHOG_PROJECT_ID}/persons/bulk_delete/` with `{ "distinct_ids": [userKey], "delete_events": true }`, header `Authorization: Bearer {POSTHOG_PERSONAL_API_KEY}` (key scoped to `person:write` only). PostHog deletes the person, its merged anon ids, and queues its events for deletion. 404 / "not found" counts as done. The builder confirms the endpoint shape against PostHog's API docs at build time and records it in the runbook.
2. **BigQuery:** a parameterised query job, `DELETE FROM \`onquest_analytics.events\` WHERE JSON_VALUE(properties, '$.user_id') = @key AND event != 'account_deleted'` (plus `distinct_id = @key`, covering rows sent before `user_id` existed), via the BigQuery REST API `jobs.query` with a service-account token signed with `node:crypto` (no new npm dependency). Service account `analytics-eraser`: `roles/bigquery.jobUser` on the project and `roles/bigquery.dataEditor` on the dataset only. Key in `BIGQUERY_ERASER_KEY` (base64 JSON).
3. Called from `deleteAccount()` **after** the database delete succeeded, inside `after()`-style best effort: a failure is logged by error name only and never fails the deletion. `account_deleted` is sent first, with `user_info: null`, and is the only row kept (key + counts, no personal data).
4. **Daily re-run.** `app/api/cron/finish-deletions` also calls `eraseAnalytics` for every `deleted_accounts` row with `saved_at` in the last 7 days (admin `select`, already granted). This catches events still in the hourly export when the first delete ran, and retries failures. Markers live 30 days (`run_retention_cleanup`), so the window is always available.
5. **Unset env (or failure 2 days running):** the cron logs `Analytics erasure pending: N`; the manual step is in `docs/runbooks/analytics-erasure.md` (PostHog UI person delete + the `bq query` DELETE with the key).

### 5.3 BigQuery views (AN-01, applied by the CTO with `bq`)

Committed as `docs/analytics/bigquery/events_clean.sql` and `internal_users.sql`.

`events_clean` columns (what the Metrics queries use, plus the rest): `event_id, name, type, ts, client_ts, user_id, anon_id, session_id, platform, os, browser, screen, country, app_version, is_internal_flg, user_info (JSON), properties (JSON)`. It:

- reads `onquest_analytics.events`, drops `$`-events except `$pageview`, drops `is_bot_flg = true`, de-duplicates on `event_id`;
- renames old events and rewrites their properties with the table below, so history and new rows read the same;
- maps old common values (`platform` `web_mobile`/`web_desktop` → 0/1; missing `type` → the v2 type of the event);
- sets `is_internal_flg = true` also for any row whose `anon_id` was ever seen with an internal `user_id`;
- derives `first_seen_ts` (MIN ts per anon_id) into `user_signed_up` properties and `days_since_last_sign_in` (LAG over the user's `user_signed_in` / `user_signed_up`) into `user_signed_in` properties.

`internal_users` = `SELECT DISTINCT user_id FROM events_clean WHERE is_internal_flg AND user_id IS NOT NULL`.

**Rename map** (also `lib/analytics/renameMap.ts`, a plain data table that `renameMap.test.ts` validates against the taxonomy, so the SQL and the code can't drift silently):

| Old event (old props) | v2 event | Property mapping |
|---|---|---|
| `create_option_tapped` {option quest/blog, available} | `create_option_click` | option quest→0, blog→1; available→available_flg |
| `blog_managed` {action visibility, value} | `visibility_changed` | content_type 1; blog_id→content_id; value public/unlisted/private→to_visibility 0/1/2 |
| `blog_managed` {action comments, value on/off} | `comments_toggled` | content_type 1; blog_id→content_id; on→comments_on_flg true |
| `blog_managed` {action delete} | `content_deleted` | content_type 1; blog_id→content_id; was_published_flg true |
| `blog_deleted` {status draft, photos, chars_bucket, has_quest} | `content_deleted` | content_type 1; was_published_flg false; photos→photo_count |
| `blog_managed` {action edit} | `blog_updated` | blog_id |
| `blog_liked` {unlike, source blog_page/feed/after_sign_in} | `content_liked` | content_type 1; unlike→unlike_flg; source→0/2/3 |
| `blog_comment_posted` {length} | `comment_posted` | content_type 1; length→comment_length |
| `legal_page_viewed` {page privacy/terms, source sign_in/settings/footer/direct} | same name | page→0/1; source→0/1/2/3 |
| `blog_create_started` {source create/write_your_own} | same name | source→click_loc 0/1 |
| `blog_quest_linked` {action link/remove} | `blog_editor_action` | action→3/7 |
| `blog_previewed` | `blog_editor_action` | action 5 |
| `blog_draft_saved` {photos} | same name | photos→photo_count |
| `blog_published` {visibility string, photos, has_quest, has_place} | same name | visibility→0/1/2; photos→photo_count; has_*→has_*_flg |
| `blog_viewed` {signed_in, referrer string, has_quest} | same name | signed_in→signed_in_flg; referrer none/whatsapp/instagram/other→0/1/2/3; has_quest→has_quest_flg |
| `blog_quest_opened` | `blog_quest_click` | unchanged |
| `blog_read_end` | unchanged (Live) | |

No other old event was ever sent (checked: no other call sites on main), so nothing else needs mapping.

### 5.4 Storage

None.

## 6. Frontend

No visible UI. Rules for every frontend task:

### 6.1 Screens

`lib/analytics/screens.ts`: `screenFor(template)` and `fromScreenFor(template)` (the INT64 `from_screen` code, 0–15 from `codes.csv`), from the route template:

| Route template | `screen` | `from_screen` |
|---|---|---|
| `/home` | home | 0 |
| `/explore` | explore | 1 |
| `/quests` | quests | 2 |
| `/@[handle]`, `/@[handle]/followers`, `/@[handle]/following` | profile | 3 |
| `/@[handle]/[slug]` | quest_page | 4 |
| `/@[handle]/blog/[slug]` (new template, AN-02) | blog_page | 5 |
| `/settings`, `/settings/profile` | settings | 6 |
| `/notifications` | notifications | 7 |
| `/quests/new`, `/quests/[key]/arrange` | create_pick | 8 |
| `/quests/[key]/review` | create_review | 8 |
| `/quests/[key]/template` | create_template | 8 |
| `/quests/[key]/preview` | create_preview | 8 |
| `/quests/[key]/share`; `PublishSheet` while open | publish | 8 |
| `/create` | other | 10 |
| `/blogs/new`, `/blogs/[key]/edit` (new templates, AN-02) | blog_editor | 11 |
| `/guides/[slug]` | other | 12 |
| `/login` | other | 13 |
| `/onboarding`, `/welcome` | other | 14 |
| `/privacy`, `/terms` | other | 15 |
| anything else (incl. `/quests/[key]/export`, `/blogs/[key]`, `/blogs/[key]/share`, `/demo`) | other | 9 |

`screens.test.ts` walks `app/` for `page.tsx` files, turns each into its public path, and asserts `screenFor(routeTemplate(path))` is defined and that only the rows above map to non-`other` screens.

### 6.2 Firing rules

- Views fire once per mount (a `useRef` guard, like `useBlogViewed`), after the data they report is known; never in render.
- Clicks fire in the handler before navigation; navigation away uses `sendBeacon` (already in `send()`).
- `quest_view_ended` and `quest_create_abandoned` fire on `pagehide` or `visibilitychange → hidden` (once per view), and on in-app exits.
- Templates stay pure: `templates/shared/QuestPlayer.tsx` gets an optional `onPageChange?(change: { pageNo; totalPages; direction; via; looped; fullscreen })` prop and `MemorySheet` an optional `onAction?(action, pageNo)`; `features/trip-page/TripView.tsx` sends the events. No analytics import in `templates/`. Jitter keys, defaults and markup don't change.
- Property builders are pure functions next to the component (`questViewedProperties()`, …) with a unit test each; components only call `track(name, builder(...))`.
- Owner views: `quest_viewed` is sent with `is_owner_flg` (the sheet keeps owner views); `blog_viewed` keeps skipping the writer (as today).

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| Don't log user text, emails or photo URLs | Yes, changed | Decision 0004: `user_info.email_id` is the one exception, added on the server only, behind `ANALYTICS_USER_INFO`. Every other property is a code, count, length, flag or key (§4.1 patterns); the generator refuses any other free STRING |
| Never store photo GPS / exact location | Yes | `photos_selected.with_location_count` is a count; geo is Vercel's city at most; no coordinates anywhere |
| Raw IP never stored | Yes | `/ingest` stops forwarding `x-forwarded-for`; `$geoip_disable: true` on every event; PostHog "Discard client IP data" stays on |
| Secret keys server-only | Yes | `POSTHOG_PERSONAL_API_KEY`, `BIGQUERY_ERASER_KEY` used only in `lib/analytics/erasure.ts` (`import 'server-only'`); Production env only |
| `getUser()` on the server | Yes | `/ingest` and `trackServer` identify with `auth.getUser()` (cached 60 s per token hash in `/ingest`) |
| No anonymous `select` policy | No change | No database change |
| Public pages read only via `get_*` | Yes | Quest/blog page events use data the page already has; the follow state for `follows_owner_flg` comes from the existing `/api/quests/{key}/me` viewer route |
| Unlisted URLs not leaked | Yes | Pageviews keep route templates (now also `/@[handle]/blog/[slug]`); `?src=` is removed from the address bar after reading; `/ingest` still drops Referer/cookies upstream |
| Cache: no per-person data in cached HTML | Yes | `oq_uid`/`oq_actx` are read in the browser and in no-store handlers; public pages stay cached; `proxy.ts` matcher unchanged |
| Analytics never fails an action | Yes | `trackServer` and `eraseAnalytics` swallow errors (error name logged only); events sent in `after()` |
| Account deletion removes everything | Yes, extended | §5.2 |

### 7.1 CLAUDE.md line (for the CTO to apply on this PR)

Replace, under "Security rules (do not break)":

> - Don't log user text, emails or photo URLs.

with:

> - Don't log user text, emails or photo URLs. One exception: analytics `user_info` (username, email, city), attached on the server only and erased on account deletion (`docs/decisions/0004-user-info-and-email-in-analytics.md`).

and under "Add a new page or feature" step 5, `lib/analytics.ts` → `lib/analytics/client.ts` (and `server.ts` for counts). This PR already updates `docs/03-security-visibility-seo.md` §B.4, `docs/01-hld.md` §3.3 and `docs/02-lld.md` §9 to point at the decision.

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content` | None | No stored shape changes | — |
| Drafts in progress | None | `publishQuest.analytics` is optional; a draft started before the release publishes fine (click_loc null) | `publishActions` test with no `analytics` |
| Migrations | None | — | — |
| Archived rows | None | — | — |
| Public functions and their zod schemas | None | — | — |
| Public URLs, slugs, handles, OG | `?src=` added to in-app links | Pages ignore unknown params; old links without it work (source falls back to referrer rules) | `src.test.ts` |
| Existing trip rendering | None | New props on `QuestPlayer`/`MemorySheet` are optional, default no-op | existing template tests |
| Storage paths and variants | None | — | — |
| Analytics events | **Breaking in PostHog** (names and types change) | One switch in AN-01; history mapped by `events_clean`; Metrics queries read `events_clean` only; PostHog insights on old names must be repointed (CTO) | `renameMap.test.ts`, Metrics dry-run |
| Server actions | `publishQuest` input gains an optional field | Optional, so the previous release's browser bundle still validates | unit |
| `/ingest` | Body is now parsed and rewritten | Unparseable bodies still forwarded (minus identity/IP); old cached browser bundles sending v1 names: PostHog receives them, `events_clean` maps them (same table) | `ingestEnrich.test.ts` with a v1-shaped body |
| Env vars | New: `ANALYTICS_USER_INFO`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_HOST`, `POSTHOG_PERSONAL_API_KEY`, `BIGQUERY_ERASER_KEY`, `NEXT_PUBLIC_ANALYTICS_E2E` (CI only) | All optional; unset = today's behaviour (no user_info, erasure skipped and logged) | unit |
| Rollback | Previous release sends v1 names again | `events_clean` handles both; nothing in Postgres to undo | — |

**Deploy order:** BigQuery views first (they handle v1 and v2 rows), then AN-01 (renames), then AN-02 with `ANALYTICS_USER_INFO` unset, AN-03 with its env vars, then the privacy policy + in-app notice (founder), then set `ANALYTICS_USER_INFO=on`. AN-04 … AN-12 in any order after AN-02.

## 9. Performance and cost

- **Page speed:** no new client library; `track()` cost unchanged. `oq_actx` write is one `document.cookie` per event. No effect on LCP.
- **`/ingest`:** one extra `getUser()` (≈ 50–150 ms, server side, off the user's path since sends are beacons) per 60 s per signed-in browser instance; Vercel function time per ingest request rises slightly. Within Hobby limits at friends-test volume.
- **PostHog:** about 3–5× more events per session than today (57 new events). Free tier is 1 M events/month; at 100 users × ~150 events/day ≈ 450 k/month. Watch it; `quest_page_turn` is the heaviest.
- **BigQuery:** views cost nothing stored; queries scan `events` (small). One DML DELETE per deleted account per day for 7 days: under 10 MB billed each, pennies.
- No Supabase image transformations; no new paid service. A personal API key and a GCP service account, both free.

## 10. Analytics

The events are the feature: names, properties and codes are exactly `docs/analytics/v2/events.csv` and `codes.csv`. Counts come from server events only:

| Counted | Server event (source of truth) | Browser events that must not be counted |
|---|---|---|
| Sign-ups / sign-ins | `user_signed_up`, `user_signed_in` | `sign_in_click` |
| Quests published / updated | `quest_creation_complete`, `quest_updated` | `preview_exit` action 1 |
| Drafts | `quest_draft_created` | `photos_selected` |
| Likes, comments, follows | `content_liked`, `comment_posted`, `comment_deleted`, `user_followed` | `comment_box_open` |
| Deletions, visibility, comments switch | `content_deleted`, `visibility_changed`, `comments_toggled`, `account_deleted` | `manage_menu_open`, `account_delete_click` |
| Notifications | `notification_sent` | `notification_click` |
| Blogs | `blog_draft_saved`, `blog_published`, `blog_updated` | `blog_create_started` |

Server events are sent only after the database write returned success, and only when the state changed (a repeat like, re-tapping the same visibility or setting sends nothing, as the sheet says).

Change-log row (AN-01 adds it to `docs/analytics/change-log.csv`, "Tested" filled when the preview check passes):

`2026-11-xx, "Analytics v2 (OQ-12, OQ-22, spec docs/specs/analytics-v2.md)", "Taxonomy v2 from docs/analytics/v2 replaces v1 (moved to docs/analytics/v1). Renamed: create_option_tapped→create_option_click; blog_managed→visibility_changed / comments_toggled / content_deleted / blog_updated; blog_deleted→content_deleted; blog_liked→content_liked; blog_comment_posted→comment_posted; blog_quest_linked, blog_previewed→blog_editor_action; blog_quest_opened→blog_quest_click; codes replace strings on legal_page_viewed, blog_create_started, blog_draft_saved, blog_published, blog_viewed. History mapped in BigQuery events_clean.", "Not yet"`

## 11. Test plan

- **Unit (Vitest), next to each file:**
  - `taxonomy.test.ts`: generated file matches the CSVs (stale check); 72 events; 1 Live + 14 rename + 57 to build in the CSV; parse cases (INT64 enum, en-dash range, open range `2–`, comma list, `(common props only)`, continuation rows); optional-list snapshot.
  - **`taxonomyRules.test.ts` (the taxonomy check):** every event has a known type and user rule; every free STRING has a pattern (no user text); every `*_flg` is BOOL; every code list a property cites ("Codes: from_screen") exists in `codes.csv`; every event type `server` in the "counted" column of §10; no name in `features/`, `app/` or `lib/` passed to `track`/`trackServer` that isn't in the taxonomy (grep over sources, so a stale call fails even if typed as `string`); no v1 name left in code.
  - `metricsSql.test.ts`: every `name = '…'` / `name IN (…)` and `'$.prop'` in `metrics.csv` exists in the taxonomy (or is a common column).
  - `renameMap.test.ts`: every mapped v2 property and value is valid in the taxonomy.
  - `validate.test.ts`: INT64 enums, ranges, patterns; a key property with a space, `@` or `http` is rejected; an email in any property except `user_info` is rejected.
  - `common.test.ts`, `screens.test.ts`, `userAgent.test.ts`, `internal.test.ts`, `userInfo.test.ts`, `ingestEnrich.test.ts` (user_id from session; spoofed key replaced; browser `user_info` overwritten; no `x-forwarded-for` upstream; v1 body forwarded), `server.test.ts` (context from cookie; notification_sent has null anon/session/user_info), `erasure.test.ts` (request shapes; 404 = done; failure doesn't throw), `codes.test.ts`, `src.test.ts`, and each event's property builder.
  - `privacy.test.ts` (extended): route templates for blog pages; `client.ts` common props contain no `user_info` / email; `oq_actx` never contains anything but ids, screen and platform.
- **Database access (`tests/db/`):** no change; `accountDelete.test.ts` and the full suite must still pass.
- **Backward compatibility:** `ingestEnrich.test.ts` with a v1-shaped body; `publishQuest` without `analytics`; `QuestPlayer` without `onPageChange`.
- **Playwright (AN-13):** the existing smoke flow (create → publish → view logged out → export one frame) with `/ingest` intercepted: every captured event is in the taxonomy and valid; `quest_viewed`, `quest_page_turn`, `quest_view_ended`, `quest_creation_complete`-preceding client events appear in order; no captured browser payload contains `user_info`, `@` or the test account's email. The bot guard lets events through only when `NEXT_PUBLIC_ANALYTICS_E2E=1`, which is set in the CI e2e job and never in Vercel (a unit test asserts it's ignored when `NODE_ENV=production` and `VERCEL=1`).
- **BigQuery (CTO, once per view change):** `bq query --dry_run` on `events_clean.sql`, `internal_users.sql` and each Metrics query (commands in `docs/runbooks/analytics-erasure.md` § Views).
- **Preview check on the Vercel preview, per task (replaces UX tests):** with PostHog's live events view open:
  - E1 signed in: events carry `user_id` and (flag on in Preview) `user_info` with your email and city; signed out: `user_id` and `user_info` null.
  - E2 every screen visited shows the right `screen`; no `unknown`.
  - E3 the task's events fire once each, with the sheet's properties, at the sheet's "Fires when".
  - E4 (AN-03) delete a test account: the person is gone from PostHog; the BigQuery DELETE ran (cron log `analytics erasure done`).

## 12. Tasks

Build mode: Backend + Frontend split. Backend lands first in each group where the frontend depends on it. Every task: one PR, CI green, Reviewer agent review.

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| AN-01 | backend | Taxonomy v2 + rename the 14 live events | `lib/analytics/{taxonomyFromCsv,generate,taxonomy,validate,codes,renameMap}.ts` + tests (`taxonomy`, `taxonomyRules`, `metricsSql`, `renameMap`, `validate`, `codes`); move `docs/analytics/*.csv` (not change-log) to `docs/analytics/v1/`; `docs/analytics/README.md`; `docs/analytics/change-log.csv`; `docs/analytics/bigquery/{events_clean,internal_users}.sql`; call sites: `features/shell/CreateChooser.tsx`, `features/blog-editor/{NewBlogView,LinkQuestRow,BlogComposer,actions}.ts(x)` + their property helpers, `features/blogs/{actions,socialActions,LiveBlogSocialProvider,LinkedQuestCard,BlogPageArticle}.ts(x)`, `features/legal/LegalViewed.tsx` | AC7, AC8, AC10, AC14 | — | `npm run analytics` regenerates `taxonomy.ts` from v2; all 14 renamed + `blog_read_end` send v2 shapes (blog halves); no v1 name in code; views dry-run clean; change-log row added |
| AN-02 | backend | Common properties, identify, screens, user_info, app_opened | `lib/analytics/{client,server,common,ids,screens,userAgent,internal,userInfo,src,routeTemplate,ingestProxy,ingestEnrich}.ts`, `Pageviews.tsx` + tests; `app/ingest/[...path]/route.ts`; `proxy.ts` (oq_uid only); `app/auth/{callback,confirm}/route.ts` (oq_uid only); `features/account/actions.ts` (clear oq_uid in signOut/deleteMyAccount); `features/editor/PublishSheet.tsx` (setScreen only); `.env.example` | AC1–AC6, `app_opened` | AN-01 | Every event has all common.csv properties; no `unknown` screen; user_info behind flag; `/ingest` drops IP; `app_opened` fires once per new session with landing_page/entry_type/signed_in_flg/first_open_flg/utm_source |
| AN-03 | backend | Analytics erasure on account deletion | `lib/analytics/erasure.ts` + test, `features/account/accountDeletion.ts`, `app/api/cron/finish-deletions/route.ts`, `docs/runbooks/analytics-erasure.md` (incl. § Views dry-run commands), `.env.example` | AC12 | AN-02 | Deleting a test account on Preview removes the PostHog person and BigQuery rows; failure logged and retried by cron for 7 days; manual runbook works |
| AN-04 | frontend | Quest page: view, unavailable, page turns, full screen, photo sheet, view ended, report | `features/trip-page/{LiveSocialProvider,TripView,QuestFullscreen,QuestUnavailable,UnavailableActions}.tsx` + builders/tests, `templates/shared/{QuestPlayer,MemorySheet}.tsx` (optional callbacks only), `features/shell/SiteFooter.tsx`; `?src=` on Quest links in `features/{home,explore,profile,quests,notifications,blogs,guides}/` card components | `quest_viewed`, `quest_unavailable`, `quest_page_turn`, `quest_fullscreen`, `quest_photo_click`, `quest_view_ended`, `report_click` | AN-02 | 7 events fire per the sheet on Preview (E3); templates import no analytics; template tests unchanged |
| AN-05 | backend | Create flow server events | `features/editor/{actions,arrangeActions,publishActions}.ts` (+ `analytics` input on `publishQuest`), builders + tests, `lib/analytics/codes.ts` (source→click_loc) | `quest_draft_created`, `quest_arranged`, `quest_creation_complete`, `quest_updated` | AN-02 | Server events sent after successful writes; `arrange_mode`, `captions_auto_kept`, `minutes_since_start`, `days_since_signup` computed on the server; old publish input still valid |
| AN-06 | frontend | Create flow client events | Every `/quests/new` link listed in the sheet (adds the missing `?source=` for Make your own and What's a Quest?), `features/editor/{NewQuestView,usePickPhotos,ReviewPages,PageCard,ChooseTemplate,PreviewQuest,EditorDraft,draftStore}.ts(x)`, `features/quests/{QuestTile,ManageQuestSheet}.tsx`, `features/blogs/ManageDraftSheet.tsx`, builders + tests | `create_quest_click`, `photos_selected`, `photo_limit_hit`, `quest_edit`, `template_select`, `quest_preview`, `preview_exit`, `draft_resumed`, `quest_create_abandoned`; sends `publishQuest.analytics` | AN-05 | 9 events per the sheet; abandon fires once on pagehide; publish passes clickLoc/editCount/changeTypes |
| AN-07 | backend (single builder) | Sign up, sign in, username, welcome | `app/auth/{callback,confirm}/route.ts`, `lib/auth/next.ts` (intent → source code), `features/account/{actions,LoginForm,SignInSheet,HandleForm,EditProfileForm,Welcome}.ts(x)` + builders/tests | `sign_in_click`, `user_signed_up`, `user_signed_in`, `username_set`, `username_rejected`, `welcome_step_viewed`, `welcome_click` | AN-02 | 7 events per the sheet; referrer_* from `?ref=`; sign-up vs sign-in by profile existence |
| AN-08 | backend | Social, notifications and manage server events | `features/trip-page/actions.ts`, `features/blogs/socialActions.ts` (comment_deleted), `features/profile/actions.ts`, `lib/email/{notify,notifyServer}.ts` (+ `?src=email`), `features/editor/publishActions.ts` (setQuestVisibility, setQuestComments, deleteQuest), builders + tests | Quest halves of `content_liked`, `comment_posted`, `visibility_changed`, `comments_toggled`, `content_deleted`; `comment_deleted`, `user_followed`, `notification_sent` | AN-02 | Sent only on state change; notification_sent has recipient user_id and null anon/session/user_info |
| AN-09 | frontend | Share, Instagram export, comment box, notification clicks, manage menu | `features/editor/ShareScreen.tsx`, `features/blog-editor/BlogShareScreen.tsx`, `features/home/{FeedCard,BlogFeedCard}.tsx`, `features/quests/ManageQuestSheet.tsx`, `features/blogs/{ManageBlogSheet,BlogTopBar,BlogList}.tsx`, `features/shell/{ShareLinkButton,AppHeader}.tsx`, `features/profile/ProfileHeader.tsx`, `features/export/ExportScreen.tsx`, `features/trip-page/{CommentComposer,QuestTopBar}.tsx`, `features/notifications/NotificationsView.tsx`, builders + tests | `share_click`, `instagram_export`, `comment_box_open`, `notification_click`, `manage_menu_open` | AN-02 (AN-08 for `?src=email`) | 5 events per the sheet; share channel is the one actually used |
| AN-10 | backend | Profile, settings and account server events | `features/account/actions.ts` (saveProfile, saveSettings, signOut, deleteMyAccount), `app/email/unsubscribe/route.ts`, builders + tests | `profile_updated`, `setting_changed`, `user_signed_out`, `account_deleted` (user_info null) | AN-03 | 4 events per the sheet; `account_deleted` survives erasure |
| AN-11 | frontend | Navigation, Home, Explore, search, guides | `features/shell/AppBottomBar.tsx`, `features/home/{HomeView,HomeFeed,HomeBanner,WhatIsAQuestSheet}.tsx`, `features/account/SettingsView.tsx` (whats_a_quest only), `features/explore/ExploreView.tsx`, `features/guides/GuideView.tsx`, builders + tests | `tab_click`, `home_viewed`, `feed_load_more_click`, `whats_a_quest_click`, `explore_viewed`, `search`, `search_result_click`, `guide_viewed` | AN-02 | 8 events per the sheet; search sends lengths and chip town only |
| AN-12 | frontend | Profile, settings, errors, blog extras | `features/profile/{ProfileView,ProfileSections,FollowsView}.tsx`, `features/quests/YourQuestsView.tsx`, `features/account/{SettingsView,DeleteAccountDialog}.tsx`, the `error_shown` locations in the sheet, `features/blog-editor/{FormatToolbar,useBodyFormatting,PhotoRow,PlaceRow,ComposerTopBar,LinkQuestRow,NewBlogView}.ts(x)`, `features/blogs/BlogUnavailable.tsx`, builders + tests | `profile_viewed`, `profile_tab_click`, `follow_list_viewed`, `settings_viewed`, `feedback_click`, `account_delete_click`, `error_shown`, `blog_format_click`, `blog_unavailable`; remaining `blog_editor_action` actions (0, 1, 2, 4, 6, 8, 9) and `blog_create_started` click_loc 2 | AN-02 | 9 events + the blog extras per the sheet |
| AN-13 | frontend | End-to-end analytics check | `tests/e2e/` (smoke + new `analytics.spec.ts`), `lib/analytics/bots.ts` (E2E override), `.github/workflows/ci.yml` (env for the e2e job only) | AC9, AC10 | AN-04, AN-06 | Playwright asserts valid events and no email in browser payloads; the override is inert in production |

## 13. Decisions

| # | Decision | Options considered | Choice | Reason | Needs CTO sign-off? |
|---|---|---|---|---|---|
| D1 | Where `user_info` is attached | (a) browser sends it; (b) `/ingest` and `trackServer` attach it from the session; (c) BigQuery join with a users table | (b) | Email never reaches the browser bundle or localStorage; one trust boundary; (c) needs Postgres data in BigQuery | **Yes** (decision 0004) |
| D2 | How client events get the user key | (a) `oq_uid` cookie set by server, client calls `identify()`; (b) `/ingest` rewrites distinct ids and emits `$identify` itself; (c) `/api/me` fetch per page | (a), with `/ingest` verifying `user_id` | Matches "call identify()"; no extra request; the proxy check stops a spoofed key | No |
| D3 | How server events get anon/session/screen/platform | (a) cookie `oq_actx`; (b) an `analytics` field on every action input | (a) | No change to dozens of action schemas; works for auth route handlers too | No |
| D4 | os / browser | (a) parse the user agent in code; (b) map PostHog's `$os`/`$browser` in BigQuery | (a) | Testable in Vitest; same value on browser and server events | No |
| D5 | `is_internal_flg` | (a) handles list in code; (b) BigQuery table of keys only (common.csv's suggestion) | (a) + `internal_users` view built from it | The brief names handles and asks for a property; the view keeps Metrics query 1 valid. Risk: a renamed handle stops being flagged (Later: keys) | No |
| D6 | Which properties are required | (a) all; (b) none; (c) required unless the sheet marks them conditional, plus an override list | (c) | Catches missing data in dev without false alarms; list snapshotted in a test | No |
| D7 | `first_seen_ts`, `days_since_last_sign_in` | (a) send from the server; (b) derive in `events_clean` | (b) | The previous sign-in time isn't available at callback (Supabase has already updated `last_sign_in_at`); the sheet itself calls first_seen_ts cheaper in BigQuery | **Yes** (deviates from the sheet) |
| D8 | `click_loc` on `quest_creation_complete` | (a) store it in the draft document; (b) browser passes it to `publishQuest` | (b) | No stored-shape change; a draft resumed on another device sends null and BigQuery can join `quest_draft_created` | No |
| D9 | BigQuery erasure | (a) automated DELETE job from Vercel; (b) manual step only; (c) BigQuery scheduled query keyed on `account_deleted` | (a) with (b) as fallback | Deletion actually happens without a human; (c) races with PostHog deleting the very event it keys on | **Yes** (new GCP service account + secret) |
| D10 | Raw IP to PostHog | (a) keep forwarding for PostHog GeoIP; (b) stop, use Vercel headers | (b) | "Never the raw IP"; one geo source for browser and server events | No |
| D11 | `user_info` on `notification_sent` | (a) recipient's; (b) null | (b) | No request from the recipient (no geo); joins on `user_id`; one less copy of an email | No |
| D12 | `/ingest` session check | `getUser()` per event; `getUser()` cached 60 s per token hash; `getClaims()` (local JWT) | cached `getUser()` | Follows CLAUDE.md; cost bounded | No |
| D13 | Old CSVs | delete; keep in place; move to `docs/analytics/v1/` | move | History for the rename map, no confusion with v2 | No |

## 14. Risks and open questions

- **Technical (for the CTO):**
  - Apply the CLAUDE.md line (§7.1) on this PR.
  - D1, D7, D9 sign-off. D9 needs a GCP service account `analytics-eraser` and a PostHog personal API key (scope `person:write`), both added to Vercel Production only.
  - `events_clean` and `internal_users` could not be checked against the live dataset from here (no BigQuery access in this session); their SQL is written in AN-01 against the PostHog export schema and must be dry-run by you before AN-01 merges. If `events_clean` already exists with a different shape, tell AN-01 before it starts.
  - PostHog insights and dashboards built on v1 names stop getting new data on AN-01's deploy; repoint them to v2 names (or read BigQuery).
  - PostHog event volume roughly triples (§9); free tier still fits the friends test.
  - The BigQuery DELETE can collide with an export load job in progress; it's retried daily for 7 days.
  - Team handle flagging breaks if a team member renames their handle (D5).
  - `/ingest` doesn't refresh sessions (only `proxy.ts` on app routes does). A signed-in person whose access token expired while reading a public page sends `user_id: null` / `user_info: null` until they next open an app route; PostHog still merges by distinct id. Accepted; measure the share on Preview (E1).
- **Product (for the founder):**
  1. Privacy policy update (decision 0004, Consequences): new text for "What we collect" (analytics now include your email, username and city when signed in; still no IP address), "Cookies and storage" (two small first-party analytics cookies: a random device/visit id and your account id), and deletion; plus the in-app notice the policy promises before a change that matters. `ANALYTICS_USER_INFO` stays off until it's live.
  2. Short legal check (DPDP) on emailing-in-analytics before public launch (already planned in `docs/03` §B.4).

## 15. Later

- A Required column in the taxonomy sheet (replaces D6's heuristic).
- Flag internal users by key instead of handle.
- Move counts dashboards from PostHog to BigQuery entirely.
- `sign_in_click.source` split of code 3 into Like / Comment / Follow / Create tab (sheet comment; not approved).
- Automatic export check that the sheet and the CSVs match (today: re-export by hand in the same PR).
