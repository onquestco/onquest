## Plan review: PASS (round 2 of 3)

Re-reviewed revision 2 (`b75f89e`): `docs/specs/analytics-v2.md` and `docs/decisions/0004-user-info-and-email-in-analytics.md`, against the same sources as round 1 (`main` code, `docs/analytics/v2/*.csv`, `CLAUDE.md`). Round 1 is in this file's history (commit `68775a1`) and in the PR comment.

Still unverifiable here: the live BigQuery dataset, PostHog project settings, and PostHog's `bulk_delete` contract. The spec now makes these explicit gates (G1, G5), which is the right home for them.

No blocking findings remain. The four Should-fix items below are each a line or two in the spec. Fix them in the spec text before the CTO approves, because builders will copy the SQL and the contract as written. If they are left, they must be checked at the AN-01 and AN-04 PR reviews.

### Round-1 blocking findings: all fixed

| # | Round-1 finding | Fixed in b75f89e? | Where |
|---|---|---|---|
| T1 | Browser-controlled `distinct_id` / `$identify`; unparseable bodies forwarded | Yes | §3.2. `/ingest` sets `distinct_id`/`user_id` from `getUser()`, otherwise from a pattern-checked `anon_id`, otherwise drops the event. It drops browser `$identify`/`$create_alias`/`$merge_dangerously` and sends `$identify` itself. Compressed, oversized and non-JSON bodies get a 204 and aren't forwarded. `oq_uid` is gone. Tests are listed in §11 `ingestEnrich.test.ts` |
| T2 | Required-property rule dropped renamed/counted events and old drafts | Yes | §4.1 has permanent and temporary overrides, each temporary one naming the task that fills it. §4.2 never drops an event. `minutes_since_start` is optional. The old-draft test is in `blogEvents.test.ts`. `expectNoProblems` proves each builder fills its required properties |
| T3 | `is_internal_flg` depended on flag-gated `user_info` | Yes | §4.2 / D5: keys in `ANALYTICS_INTERNAL_USER_KEYS` plus the `internal_users` table, independent of the flag. The test asserts it with the flag unset |
| T4 | Cookies shipped before the policy | Yes | `oq_uid` is removed, and `oq_actx` sits behind `NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE` until G3 |
| T5 | Erasure unprovable before the flag | Yes | D15 adds a separate Preview PostHog project, BigQuery dataset and keys. G5 is a Preview proof before AN-04 merges; G6 is a Production proof before `on` |
| T6 | AN-13 (now AN-14) couldn't run | Yes | It's a manual Preview gate like `blogs.spec.ts`. The override is inert when `NEXT_PUBLIC_VERCEL_ENV=production`. The `@` check is replaced by an email/handle check. A CI e2e job is listed under §15 Later |
| F1 | Policy before cookies (founder) | Handled either way | The spec holds the cookie and `user_info` back until G3. The founder's answer now only sets timing |

Round-1 Should-fix items #7–#13 and Notes #14–#16 are all addressed: 30-day re-run plus `deleted_users`, `userInfoForSession` (`server-only`, bounded cache), PostHog type resets and the insights list (G4), the `ts` mapping, the frozen v1 allowlist, the `properties` type and `ip` (G1), `events_people`, the strict merge order with a shared-file table, the AN-01/AN-02 split, Preview on `team`, `screens.test.ts` reversing the rewrites, and one CLAUDE.md wording.

### For the founder (product)

1. **[Note] The three round-1 questions are still open, but none blocks the spec now.**
   - (1) Policy timing: the spec's default (hold the cookie and `user_info` until the policy is live) is safe.
   - (2) "Within 30 days" and listing Google Cloud (BigQuery) as a service: both are now in decision 0004's Consequences and spec §14.
   - (3) Plain email in PostHog (US host) and BigQuery.

   Gate G3 is yours: nothing personal is collected until you publish the policy and the in-app notice.

### For the Tech Lead (technical)

1. **[Should fix] spec §5.2 step 3, the erasure DELETE also removes other people's signed-in rows on a shared device.**
   - The `anon_id IN (…)` branch has no condition on `user_id`. If A and B both signed in on one laptop, deleting A also deletes B's events from that device: B's `blog_published`, `content_liked`, and the rest (server events carry the device's `anon_id` once `oq_actx` is on).
   - That breaks counted totals and can't be undone once time travel ends.
   - The spec's own note ("a shared device's signed-out rows go too") describes the intended behaviour, but the SQL is wider than that.
   - **Fix:** add `AND (JSON_VALUE(properties,'$.user_id') IS NULL OR JSON_VALUE(properties,'$.user_id') = @key)` to that branch. Clarify that `distinct_id` is not someone else's key. Add a shared-device case to `erasure.test.ts` (check the SQL it builds) and to the G5 steps.
2. **[Should fix] spec §5.3, the `events_clean` anti-join hides `account_deleted`.**
   - "Leaves out every row whose `user_id` … belongs to `deleted_users`" also removes `account_deleted`, whose `user_id` is the deleted key (§5.2 step 1).
   - Deletions then vanish from `events_clean`, which contradicts decision 0004 §6 ("kept, so deletions can still be counted") and §10's counted table.
   - **Fix:** exempt `name = 'account_deleted'` from the anti-join, as the DELETE already does.
   - The same bullet says "or `anon_id` belongs to `deleted_users`", but that table holds user keys only. Either drop that wording or say which anon ids are meant (see #3).
3. **[Should fix] spec §5.2, the daily re-run can't find late signed-out device rows.**
   - Day 1 deletes every row that links an `anon_id` to the key. So on days 2–30, the `SELECT DISTINCT anon_id … WHERE distinct_id = @key OR user_id = @key` subquery returns nothing.
   - Signed-out rows from those devices that reach BigQuery later (hourly export lag, backfill) are never deleted or anti-joined.
   - **Fix:** on the first run, store the person's anon ids in a key-only table (e.g. `deleted_devices (anon_id, deleted_at)`; random ids, not personal). Use it in both the re-run DELETE and the `events_clean` anti-join, with the same `user_id IS NULL OR = @key` guard as #1.
4. **[Should fix] spec §4.2 / §5.3, with `oq_actx` off, server events carry `anon_id = null`, which breaks two Metrics and one derived property.**
   - The cookie stays off until G3, which may be weeks away. Meanwhile:
     - "Viewer → creator" (`metrics.csv` row 4) joins `quest_viewed` (browser) to `quest_creation_complete` (server) by `anon_id`, so it returns 0.
     - `first_seen_ts` is "MIN(ts) per anon_id written into `user_signed_up`", and `user_signed_up` is a server event, so it comes out null.
   - §4.2 says "BigQuery joins them to browser events by `user_id`", but neither the view nor the queries do that.
   - **Fix:** in `events_clean`, fill a null `anon_id` on server events from the same `user_id`'s browser rows (latest at or before `ts`; the `person_id` logic in §5.3 already needs that mapping). Or change those two Metrics to `person_id` and add it to the sheet change in §14. Add both Metrics to G1's dry-run, with a check that they return non-zero on Preview data.
5. **[Note] spec §4.2, the `trackServer` contract.** "`userKey` must equal the session user except `notification_sent` and `account_deleted`." The AN-11 unsubscribe route (`setting_changed`, no session) is a third exception. Add it to the list so the AN-11 builder doesn't stop on it.
6. **[Note] spec §8 rollback.** The row mixes two concerns. Spell out both:
   - (a) rolling back past AN-03 brings back IP forwarding to PostHog (only PostHog's "Discard client IP data" setting protects then);
   - (b) rolling back past AN-04 after `user_info` is on stops automatic erasure, so the runbook's manual step applies to every deletion until roll-forward.
7. **[Note]** `NEXT_PUBLIC_ANALYTICS_CONTEXT_COOKIE` and `NEXT_PUBLIC_ANALYTICS_E2E` are inlined at build time, so switching them needs a redeploy. Say so in G3 and in AN-14's steps.
8. **[Note]** The shared-file table in §12.1 misses `features/blogs/LiveBlogSocialProvider.tsx` (AN-02, AN-13), `features/blogs/{socialActions,actions,blogEvents}.ts` and `features/blog-editor/actions.ts` (AN-02, AN-09). The strict merge order makes this harmless, so it's for completeness only.

### Coverage

| Brief / sheet criterion | In spec? | Implemented by | Tested by |
|---|---|---|---|
| AC1 identify everywhere | Yes (server-side, D2 for CTO sign-off) | `/ingest` identity + `$identify` | `ingestEnrich.test.ts`, E1 |
| AC2 setScreen everywhere | Yes | `screens.ts`, `Pageviews.tsx` | `screens.test.ts` (groups + rewrites), E2 |
| AC3 common props | Yes | `common.ts` | `common.test.ts`, `server.test.ts` |
| AC4 is_internal_flg | Yes | `internal.ts` (keys), `internal_users` | `internal.test.ts`, Metric 1 dry-run |
| AC5 is_bot_flg | Yes | `/ingest`, `trackServer` | `privacy.test.ts`, `ingestEnrich.test.ts` |
| AC6 user_info, no raw IP | Yes | `userInfo.ts` (`server-only`), `/ingest` | `userInfo.test.ts`, `ingestEnrich.test.ts`, `privacy.test.ts` |
| AC7 generated taxonomy | Yes | AN-01 | `taxonomy.test.ts`, `taxonomyRules.test.ts` |
| AC8 renames, blog events keep working | Yes | AN-02, `renameMap.ts`, `events_clean` | `renameMap.test.ts`, old-draft test, G1 |
| AC9 57 new events | Yes | AN-05 … AN-13 | builders (`expectNoProblems`), E3, AN-14 |
| AC10 no user text | Yes | generator patterns, validation removes email-shaped values | `taxonomyRules.test.ts`, `validate.test.ts` |
| AC11 server counts | Yes | §10 | `taxonomyRules.test.ts` (but see Tech #2 for `account_deleted`) |
| AC12 erasure | Yes | `erasure.ts`, cron 30 days, `deleted_users` | `erasure.test.ts`, G5, G6 (Tech #1, #3) |
| AC13 CLAUDE.md, decision, policy | Yes | 0004, §7.1, §14, G3 | review |
| AC14 Metrics valid | Yes | `events_clean`, `metricsSql.test.ts` | G1 (Tech #4 for two queries) |
| AC15 tests per CLAUDE.md | Yes | — | CI; no DB change |

### Security and privacy

| Rule | Planned correctly? | Notes |
|---|---|---|
| Don't log user text/emails (exception 0004) | Yes | server-only, own session only, gated `off`/`team`/`on` |
| Identity can't be spoofed | Yes | server decides `distinct_id`/`user_id`/merge |
| Raw IP never stored | Yes | no `x-forwarded-for`, `$geoip_disable`, `ip` never selected, history checked at G1 |
| Secret keys server-only | Yes | `erasure.ts`, `userInfo.ts` `server-only`; keys per environment |
| `getUser()` on the server | Yes | bounded cache |
| Public reads / RLS | Not touched | no DB change (confirmed: no migration in the diff) |
| Unlisted URLs not leaked | Yes | route templates, `?src=` stripped |
| No per-person data in cached HTML | Yes | no server-set cookie |
| Notice before collection | Yes | G3 gates `oq_actx` and `user_info` |
| Personal data access in BigQuery | Yes | `events_clean` has no email; `events_people` is founders-only |
| Account deletion removes everything | Mostly | Tech #3 (late device rows). Tech #1 over-deletes others' data (integrity, not privacy) |

### No in-place updates

| Record | Key | Save function | Conflict check | User delete | OK? |
|---|---|---|---|---|---|
| None in Postgres; erasure only reads `deleted_accounts` with the admin client | — | — | — | `deleteAccount()` unchanged, erasure appended | Pass (not touched) |

### Backward compatibility

| Area | Safe? | Notes |
|---|---|---|
| Stored content / old drafts | Pass | old-draft `blog_published` test |
| Migrations / public functions / RLS | Not touched | |
| Public URLs, OG | Pass | `?src=` optional, stripped |
| Rendering existing trips | Pass | optional template callbacks |
| Storage | Not touched | |
| Server actions | Pass | `publishQuest.analytics` optional |
| PostHog names and property types | Accepted break, handled | G4 list and type resets |
| BigQuery history | Plausible, gated | G1 dry-run; v1 `distinct_id` and `ts` mapping specified |
| Old tabs / rollback through `/ingest` | Pass | frozen v1 allowlist for 30 days (contract step in §15). Rollback notes, Tech #6 |
| Env vars | Pass | all new, optional |

### Tracker (no Sheets tool in this session; please apply)

PASS: row "Analytics v2 (OQ-12)" → `6. Spec approval (CTO)`, Owner `CTO`. Notes: "Plan review round 2: PASS, 0 blocking, 4 should-fix (erasure SQL shared-device guard, account_deleted anti-join exemption, late device rows, anon_id on server events while cookie off). Founder Qs 1–3 open, gated by G3. CTO sign-off needed on D1, D2, D7, D9, D14, D15."

### Verdict

PASS. All six round-1 blocking findings are fixed. Before the CTO approves:
- Fold Tech #1–#4 into the spec text. They are small, and three of them are the exact SQL builders will copy.
- Sign off D1, D2, D7, D9, D14 and D15.
- Plan gates G1–G6.

The founder's answers are needed before G3, not before approval.
