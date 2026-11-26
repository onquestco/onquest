## Plan review: CHANGES NEEDED (round 1 of 3)

Reviewed: `docs/specs/analytics-v2.md`, `docs/prds/2026-11-analytics-v2.md`, `docs/decisions/0004-user-info-and-email-in-analytics.md`, `docs/analytics/v2/{events,common,codes,metrics}.csv`, the doc edits in this PR, against `main` (`lib/analytics/*`, `app/ingest/[...path]/route.ts`, `proxy.ts`, `features/account/accountDeletion.ts`, `app/api/cron/finish-deletions/route.ts`, migrations 12/16/17, `features/legal/PrivacyPolicy.tsx`, `features/blogs/blogEvents.ts`, `tests/e2e/*`, `.github/workflows/ci.yml`) and `CLAUDE.md`.

Couldn't check: the live BigQuery dataset (no GCP credentials in this session, same as the Tech Lead), the PostHog project settings, and the exact PostHog `persons/bulk_delete` contract. Findings that depend on these are marked as such.

### For the founder (product)

1. **[Blocking] Privacy policy must be live before AN-02, not only before `ANALYTICS_USER_INFO=on`.** `PrivacyPolicy.tsx` "Cookies and storage" says *"We use only the cookies needed to keep you signed in, plus the random analytics ID in your browser's storage."* AN-02 ships two new analytics cookies (`oq_uid` = account id, 400 days; `oq_actx`), and spec §8's deploy order puts the policy after AN-02 and AN-03. From AN-02's deploy the live policy is wrong. **Question:** do you want the policy update (and in-app notice) live before AN-02 deploys, or should AN-02 hold the cookies back until it is? (Tech fix is in Technical #4.)
2. **[Should fix] The policy text in spec §14 is missing two things.** (a) Google Cloud / BigQuery is not in the policy's "Services we use" list, yet it will hold emails and city; add it next to PostHog. (b) Deleted data isn't gone instantly: PostHog deletes events in the background and BigQuery keeps deleted rows in time travel / fail-safe for up to about two weeks. The deletion wording should say "within N days", not "immediately". **Question:** OK to say "within 30 days"?
3. **[Note] Plain-text email in analytics is a privacy call.** Decision 0004 records it as a CTO decision. The policy, the in-app notice and the DPDP review are yours. **Question:** do you agree with plain email (not hashed) being sent to PostHog (US host) and BigQuery, given decision 0004 says the reason is support and checking cohorts by hand?

### For the Tech Lead (technical)

1. **[Blocking] spec §3.2 / §4.4 / D2, the `/ingest` trust boundary leaves identity in the browser's hands.**
   - Only the `user_id` property is checked against the session. `distinct_id` and `$identify` (`$anon_distinct_id`) still come from `oq_uid`, a cookie that isn't httpOnly and holds a user key that already appears in public API paths. Anyone can set `oq_uid` to someone else's key. Their events then land on that person in PostHog, and `$identify` merges their anon id into that person. If the attacker is signed in, their own `user_info` (their email) gets filed under the victim's distinct id. When the attacker later deletes their account, the PostHog bulk delete by `distinct_ids: [attackerKey]` misses those events, so their email stays in PostHog after erasure.
   - §4.4 says bodies over 64 KB or that don't parse are "forwarded unchanged **minus** IP, and `user_info`/`user_id` set to null". You can't set fields in a body you couldn't parse. As written, a gzip or oversized body skips enrichment and the allowlist and goes through with whatever `user_info`/email the browser put in it.
   - **Fix:** `/ingest` sets `distinct_id` itself (verified user key, else the body's `anon_id` if it matches `^anon_[0-9a-f-]{36}$`). It drops any `$identify`, `$create_alias` or `$merge_dangerously` whose target isn't the verified key. Unparseable, compressed or oversized bodies are dropped (204), never forwarded. Add each case to `ingestEnrich.test.ts`.
2. **[Blocking] spec §4.1 D6 required-property rule + the existing drop-on-problem (`validate.ts` `propertyProblems` → event dropped) silently drops the renamed events in AN-01, and breaks an existing draft shape.** I applied the D6 heuristic to `events.csv`. Every property of the 14 renamed events comes out *required*, including ones AN-01 can't fill: `create_option_click.from_screen` (screens arrive in AN-02), `blog_viewed.source` (`?src=` is in AN-02's `src.ts`), `blog_viewed.author_user_id`/`read_time_min`, `content_liked.owner_user_id`/`like_count_after`, `comments_toggled.comment_count`, `content_deleted.like_count`/`comment_count`/`age_days`, `visibility_changed.from_visibility` is optional by override but `days_since_publish` isn't, `blog_published.is_first_blog_flg`, `blog_updated.days_since_post`, `comment_posted.owner_user_id`/`is_owner_flg`.
   - Worse, `blog_published.minutes_since_start` was *optional* in v1 and becomes required. `features/blogs/blogEvents.ts:26-29` leaves it undefined when the draft has no `startedAt`, which is true of drafts saved before that field existed (there's a test for exactly this: `blogEvents.test.ts:61`). Publishing such a draft would drop `blog_published`, a *counted* server event.
   - That breaks §3.3 ("no release where a blog event isn't sent") and the history behind "Blog adoption".
   - **Fix:** in AN-01's Done-when, list a source for every required property of the 14 events, or add them to `OPTIONAL_OVERRIDES` until the task that supplies them. Add `minutes_since_start` to the overrides. Make server events never drop on a missing required property: send the event and log the problem name in dev and CI. Add a test with an old-shape blog draft (no `startedAt`) proving `blog_published` is sent.
3. **[Blocking] spec §4.2 / D5, `is_internal_flg` depends on the flag-gated `user_info`.** The common-props table sets `is_internal_flg` from `user_info.username`. `user_info` is `null` until `ANALYTICS_USER_INFO=on` (after the policy, weeks away), and on `user_signed_up` the username is null anyway (no handle before onboarding). Until then team traffic is never flagged, `internal_users` stays empty, and Metric 1 (the primary metric, "team accounts excluded") counts the team. Handles can also be renamed and then claimed by someone else, who would then be flagged internal. **Fix:** compute `is_internal_flg` on the server from the verified user key, either a constant `INTERNAL_USER_KEYS` (keys aren't personal) or the handle looked up separately, independent of the flag. Seed `internal_users` from that list so BigQuery history (v1 rows carry no username) is flagged too. `internal.test.ts` must prove the flag is set with `ANALYTICS_USER_INFO` unset.
4. **[Blocking] spec §8 deploy order ships the new cookies before the policy covers them** (founder #1). **Fix:** either move "privacy policy + in-app notice" before AN-02 in the deploy order, or have AN-02 keep `oq_actx`/`oq_uid` behind a server flag (or keep `anon_id`/`session_id` in `localStorage` and pass them in the `/ingest` body / an action header) until the policy is live. State which one.
5. **[Blocking] AC12 (erasure) can't be proved before `user_info` goes on.** §11 E4 says "delete a test account on Preview: the person is gone from PostHog; the BigQuery DELETE ran". But D9 / §14 set `POSTHOG_PERSONAL_API_KEY` and `BIGQUERY_ERASER_KEY` in **Vercel Production only**, so on Preview erasure is "skipped". Decision 0004 §5(b) makes AN-03 in production a precondition for the flag, and nothing tests it end to end. **Fix:** either a Preview PostHog project and BigQuery dataset with their own eraser credentials, or an explicit production step before the flag: a team test account, delete it, confirm the PostHog person is gone and `SELECT COUNT(*) … WHERE user_id = @key` is 0 after the next cron run. Record that as a gate in §8, and have the runbook hold the result.
6. **[Blocking] AN-13 / §11 Playwright can't run as specified.** There is no e2e job in `.github/workflows/ci.yml`. Playwright isn't installed (`tests/e2e/playwright.config.ts` header says it runs by hand against a Vercel preview). CI has no Supabase, so "create → publish" can't run there. The "existing smoke flow" doesn't exist (only `blogs.spec.ts`). So `NEXT_PUBLIC_ANALYTICS_E2E` "set in the CI e2e job and never in Vercel", with a unit test making it inert when `VERCEL=1`, means the test can never see an event. Also "no captured browser payload contains `@`" fails on every `$pageview` and every route template (`/@[handle]/[slug]`). **Fix:** say where AN-13 runs. If on a Vercel preview, the override must be allowed on Preview, so assert it's inert when `VERCEL_ENV=production` instead. Replace the `@` check with "no payload contains the test account's email or handle". Either add a CI e2e job (with what backend?) or say it's a manual gate like `blogs.spec.ts`.

7. **[Should fix] spec §5.2 erasure gaps.**
   - (a) The re-run window is 7 days. PostHog batch exports can be paused and backfilled later than that, which brings deleted rows back. Markers live ≥ 30 days (`run_retention_cleanup` is weekly, deletes markers older than 30 days), so re-run for 30 days. Better still, keep a key-only `deleted_users` table in BigQuery that `events_clean` anti-joins.
   - (b) Anon-only rows (pre-sign-in, and every v1 browser row, because `identify()` was never called on `main`) stay. They're linkable to the person through `anon_id` on the kept `account_deleted` row and through `events_clean`'s anon→internal propagation. Either also delete rows whose `anon_id` was seen with `user_id = @key`, or drop `anon_id`/`session_id` from `account_deleted`.
   - (c) PostHog `delete_events: true` also deletes `account_deleted` in PostHog (only BigQuery keeps it). Say so. Sending it "first" also races with the person delete and can recreate the person.
   - (d) PostHog event deletion is asynchronous (unverified here; the builder should confirm the timing with the endpoint), so E4's "person gone" isn't "events gone".
   - (e) `jobs.query` needs the GCP project id and dataset location. Say where they come from (the key JSON has `project_id`; the location isn't there).
8. **[Should fix] spec §4.2, the `userInfo.ts` contract.**
   - `userInfoForRequest(userKey)` takes a key, but §3.2 says `user_info` comes from the verified session. Specify that it returns `null` unless the session user equals `userKey`, so the cron, `app/email/unsubscribe` (AN-10, no session) and `notification_sent` can never look up someone's email by key.
   - Mark `userInfo.ts` `import 'server-only'` (that's the real guard for "no email in the client bundle"; §11's `privacy.test.ts` wording is vague).
   - Bound the 60 s `getUser()` cache (size cap) and say how the handle is looked up and cached.
9. **[Should fix] §8 compatibility of the renames for existing PostHog / BigQuery history.**
   - (a) Same property names change type: `platform` (string → INT64), `visibility`, `referrer`, `source`, `page`, `action`. PostHog keeps one type per property definition, so filters and breakdowns on those break, beyond the renamed events. List them and add "reset property types in PostHog" to the CTO steps.
   - (b) List the existing PostHog insights and dashboards to repoint, and make that list part of AN-01's Done-when, not "CTO, later".
   - (c) `ts` changes meaning: v1 browser rows were sent with `timestamp` = device time, v2 rows get server time. `events_clean` should map v1 browser rows' `timestamp` into `client_ts` and say `ts` is device time before the cut-over.
   - (d) `/ingest` "strips anything else not in the allowlist". If the allowlist is the v2 taxonomy, an old tab or a rollback build sending v1 names loses the v1 properties `events_clean` needs to map. That contradicts the "v1 body forwarded" test. Specify: v1 names pass with their v1 properties (identity still enforced), or they're dropped and the gap is accepted.
10. **[Should fix] §5.3 BigQuery views, plausibility against the PostHog BigQuery batch export.**
    - The columns the spec relies on exist in PostHog's default events model (`uuid, event, properties, distinct_id, timestamp, ip, …`), and the DELETE's `event`, `distinct_id` and `JSON_VALUE(properties, '$.user_id')` are valid for both STRING and JSON `properties`.
    - But: (a) say which type `properties` is in this export (STRING unless "JSON type" was chosen). Rewriting v1 properties and deriving `first_seen_ts` / `days_since_last_sign_in` into `properties` needs `SAFE.PARSE_JSON` + `JSON_SET`/`JSON_REMOVE`, and the view output must be JSON for the Metrics `JSON_VALUE` calls. (b) `user_id`/`anon_id`/`session_id`/`platform`/`screen` aren't columns; they come out of `properties`, and v1 rows have no `user_id`, so anon→internal propagation and erasure for history must use `distinct_id`. (c) Never expose the export's `ip` column in `events_clean`. `/ingest` forwards `x-forwarded-for` today, so the CTO should check that column is empty in history (it depends on "Discard client IP data" having always been on). (d) `events_clean` exposes `user_info.email_id` to every Metrics reader. Consider an `events_clean` without `email_id` plus a founders-only `events_people` view. (e) AN-01's Done-when has "views dry-run clean", which the builder can't do (no BigQuery access). Make it an explicit CTO gate on AN-01's merge.
    - The Metrics DAU query (`COALESCE(user_id, anon_id)`) counts one person twice on the day they sign in. Note it in `metrics.csv` or map anon→user in the view.
11. **[Should fix] §12 task split and ordering.**
    - §8 says "AN-04 … AN-12 in any order after AN-02", which contradicts the table (AN-06 needs AN-05, AN-09 needs AN-08, AN-10 needs AN-03).
    - Files shared without an order: `features/account/actions.ts` (AN-02, AN-07, AN-10); `app/auth/{callback,confirm}/route.ts` (AN-02, AN-07); `features/editor/publishActions.ts` (AN-05, AN-08); `features/quests/ManageQuestSheet.tsx` (AN-06, AN-09); `features/account/SettingsView.tsx` (AN-11, AN-12); `features/home/FeedCard.tsx`, `BlogFeedCard.tsx`, `features/blogs/BlogList.tsx` (AN-04 `?src=` and AN-09); `features/blog-editor/{LinkQuestRow,NewBlogView}.tsx` (AN-01, AN-12); `lib/analytics/codes.ts` (AN-01, AN-05, and in practice every task); `.env.example` (AN-02, AN-03). Give an order or a merge rule.
    - `account_deleted` is owned by AN-10 but §5.2.3 (AN-03) defines when it's sent. Give it to one task.
    - AN-01's touch list misses `features/blogs/{blogEvents,readerEvents}.ts`, `features/blogs/ManageBlogSheet.tsx` (also in AN-09), `features/shell/CreateChooser.test.ts`, `features/blog-editor/deleteBlogDraft.test.ts` and `tests/e2e/blogs.spec.ts` (asserts `blog_viewed`), which all reference v1 names.
    - AN-01 is the largest task (generator, 14 renames with new required props, views, rename map, 6 tests). Consider splitting the generator and tests from the call-site renames.
12. **[Should fix] Preview with the flag on (E1).** HLD says Preview has its own Supabase project, but the spec doesn't say which PostHog project Preview sends to. UX testers on Preview are real people, so turning `ANALYTICS_USER_INFO=on` there sends their emails before the policy is live. Either use a separate PostHog project for Preview, or limit flag-on in Preview to team accounts and state it.
13. **[Should fix] `screens.test.ts` (§6.1)** walks `app/` for `page.tsx`. The real files are `app/(public)/u/[handle]/…`, `app/(public)/b/[handle]/[slug]` and `app/(app)/(signed-in)/u/[handle]/{followers,following}`, served through the `next.config.ts` rewrites. The test must map route groups and reverse the rewrites, or it tests paths users never see. `/` (`app/(public)/page.tsx`) isn't in the table; say it's `other`.
14. **[Note]** The CLAUDE.md replacement line differs between decision 0004 Consequences ("analytics `user_info.email_id` … (decision 0004)") and spec §7.1 ("`user_info` (username, email, city) … erased on account deletion"). Pick one. Use §7.1's: it's wider and mentions erasure.
15. **[Note]** `common.csv` says `country` "moves into `user_info.geoip`". The spec keeps a top-level `country` too (fine, it's needed for signed-out events). Record it as a deliberate deviation next to D7.
16. **[Note]** `oq_uid` set in `proxy.ts` on every matched response: keep the existing no-store header behaviour whenever a `Set-Cookie` is added, so a CDN never caches a response carrying it.

### Coverage

| Brief / sheet criterion | In spec? | Implemented by | Tested by |
|---|---|---|---|
| AC1 identify everywhere | Yes | `oq_uid` + `client.ts`; `/ingest` user_id | `client.test.ts`, `ingestEnrich.test.ts`, E1. Gap: distinct_id / `$identify` not verified (Tech #1) |
| AC2 setScreen everywhere | Yes | `screens.ts`, `Pageviews.tsx` | `screens.test.ts` (needs rewrite mapping, Tech #13), E2 |
| AC3 common props | Yes | `common.ts`, `oq_actx` | `common.test.ts`, `server.test.ts` |
| AC4 is_internal_flg | Yes, wrong dependency | `internal.ts` via `user_info.username` | `internal.test.ts`. Fails while flag off (Tech #3) |
| AC5 is_bot_flg | Yes | `/ingest`, `trackServer` | `privacy.test.ts`, `ingestEnrich.test.ts` |
| AC6 user_info, no raw IP | Yes | `userInfo.ts`, `/ingest` | `userInfo.test.ts`, `ingestEnrich.test.ts`. Gap: unparseable bodies (Tech #1), server-only (Tech #8) |
| AC7 generated taxonomy, script kept | Yes | `taxonomyFromCsv.ts`, `generate.ts` | `taxonomy.test.ts`, `taxonomyRules.test.ts` |
| AC8 14 renames, blog events keep working, change log | Partly | AN-01 call sites, `events_clean`, `renameMap.ts` | `renameMap.test.ts`, dry-run. Events dropped by required rule (Tech #2) |
| AC9 57 new events in order | Yes | AN-04 … AN-12 | builders, E3, AN-13 (can't run as written, Tech #6) |
| AC10 no user text | Yes | generator patterns | `taxonomyRules.test.ts`, `validate.test.ts` |
| AC11 server events for counts | Yes | §10 | `taxonomyRules.test.ts` |
| AC12 erasure (PostHog + BigQuery) | Yes, unproven | `erasure.ts`, cron, runbook | `erasure.test.ts` (mocks only); E4 impossible on Preview (Tech #5) |
| AC13 CLAUDE.md rule, decision, policy flag | Yes | 0004, §7.1, §14 | review; policy ordering (Founder #1) |
| AC14 Metrics queries valid | Yes | `events_clean`, `internal_users` | `metricsSql.test.ts`, CTO dry-run (gate, Tech #10e) |
| AC15 tests per CLAUDE.md | Yes | — | CI; no `tests/db/` change needed (no DB change, confirmed: no migration in the diff) |

### Security and privacy

| Rule | Planned correctly? | Notes |
|---|---|---|
| Don't log user text, emails, photo URLs | Exception documented (0004) | Generator refusing free STRINGs is good. Email stays server-side only if Tech #1 and #8 are fixed |
| Raw IP never stored | Mostly | Stop forwarding `x-forwarded-for` + `$geoip_disable`. Check the BigQuery `ip` column in history (Tech #10c) |
| Secret keys server-only | Yes | `erasure.ts` `server-only`. Also needed on `userInfo.ts` (Tech #8) |
| `getUser()` on the server | Yes | cached 60 s, bound the cache |
| Public reads via `get_*` only; no anon select | Not touched | no DB change |
| Unlisted URLs not leaked | Yes | route templates, `?src=` stripped, Referer dropped |
| No per-person data in cached HTML | Yes | proxy matcher unchanged, Note #16 |
| Identity can't be spoofed | **No** | distinct_id / `$identify` (Tech #1) |
| Account deletion removes everything | Partly | 7-day window, anon rows, Preview proof (Tech #5, #7) |
| Notice before collection | **No** | cookies before policy (Founder #1, Tech #4) |
| Access to personal analytics data | Partly | `events_clean` shows emails to every query reader (Tech #10d) |

### No in-place updates

| Record | Key | Save function | Conflict check | User delete | OK? |
|---|---|---|---|---|---|
| None in Postgres (analytics go to PostHog/BigQuery; erasure only reads `deleted_accounts` via the admin client, which has `select`) | — | — | — | `deleteAccount()` unchanged; erasure added after it | Pass (not touched). BigQuery DML DELETE is on the analytics store, outside decision 0001 |

### Backward compatibility

| Area | Safe? | Notes |
|---|---|---|
| Stored `trips.content` / blog drafts | **Fail** | No shape change, but old drafts without `startedAt` lose `blog_published` under the new required rule (Tech #2) |
| Migrations / public functions / RLS | Not touched | no DB change |
| Public URLs, OG | Pass | `?src=` optional and stripped; pages ignore it |
| Rendering of existing trips | Pass | optional `QuestPlayer`/`MemorySheet` callbacks; jitter/defaults untouched |
| Storage | Not touched | |
| Server actions (`publishQuest.analytics` optional) | Pass | old bundles validate |
| Analytics event names (PostHog) | Accepted break, incomplete | type changes on kept property names; insights list (Tech #9a, #9b) |
| Analytics history (BigQuery) | Plausible, unverified | `events_clean` mapping. `ts` semantics, v1 `distinct_id`, `properties` type (Tech #9c, #10) |
| Old tabs / rollback through `/ingest` | **Unclear** | allowlist may strip v1 props (Tech #9d) |
| Env vars | Pass | all new, optional; unset = today's behaviour |
| Cookies | **Fail vs policy** | Founder #1 |

### Tracker (no Sheets tool used in this session; please apply)

Row "Analytics v2 (OQ-12)": `Blocked`, Owner `Founder`. Notes: "Plan review round 1: 6 blocking (5 technical, 1 product). Founder Qs: (1) policy live before AN-02 or cookies held back? (2) OK to add Google Cloud/BigQuery as a processor and say deletion completes within 30 days? (3) Agree to plain email in PostHog/BigQuery?" The Tech Lead revises the spec in parallel for Technical #1–#6.

### Verdict

CHANGES NEEDED. Before the CTO approves:
- `/ingest` owns `distinct_id` and identify, and drops unparseable bodies (#1).
- The required-property rule can't drop renamed or counted events, and old drafts still produce `blog_published` (#2).
- `is_internal_flg` works with the flag off (#3).
- Policy and cookie ordering is fixed (#4, founder #1).
- Erasure gets a real end-to-end proof before the flag goes on (#5).
- AN-13 runs somewhere real, with assertions that can pass (#6).

The Should-fix items (#7–#13) can go in the same revision. Most are one line each in the spec.
