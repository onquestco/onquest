# Plan review: OnQuest MVP, round 3 (final)

## Plan review: PASS for the technical plan, with founder blockers open (round 3 of 3)

Reviewed on `spec/onquest-mvp` at `2ad1e83` (the Tech Lead's round-3 revision, on top of round 2 at `2a38517`), 10 Nov 2026. No GitHub PR exists, so this file stands in for the spec-PR comment.

I read the full round-3 diff (specs A, B, C, the task list and HLD), the changes sections (A §18, B §17, C §17), and the code the fixes depend on: `supabase/seed.sql`, `tests/db/testDatabase.ts`, `app/auth/callback/route.ts`, `features/account/actions.ts`, `features/account/getCurrentUser.ts` and `vercel.json`. As in earlier rounds, I didn't run checks (a plan review covers documents) and couldn't read Vercel's, Resend's or Nominatim's live terms.

**Verdict.** Both round-2 Tech Lead blockers are fixed, the should-fix items are fixed or properly turned into CTO decisions, and the fixes add **no new blocking problems**. The spec set is ready for CTO approval once the founder answers **F-A1** (M3) and **F-B1** (M10). The four should-fix items below are small and can be done as conditions on the tasks that own them (C-05, A-07) rather than in another spec round.

---

### Round-2 blockers: status

| Round 2 | Status | Fixing text (quoted) |
|---|---|---|
| Blocker 1: migration 8 vs the seed and `get_*` | **Fixed** | A §5 item 2: "**Replace `get_trip`, `get_profile` and `list_sitemap_trips` in the same migration** (`create or replace`, same arguments, byte-for-byte the same output), changing only `profiles.id`/`p.id` to `profiles.key`/`p.key`." Also: "**`supabase/seed.sql`**: A-02 changes the profiles insert to the `key` column". Test: "`migration8.test.ts` (A-02): with migrations 1–8 and the seed only (`createTestDatabase({ upTo: '08' })`) … `get_trip` for the seed trip deep-equals the fixture captured from migrations 1–7". A-02 now owns `seed.sql` (profiles insert), the fixture and the `upTo` option, and the shared-file order is `seed.sql` A-02 → A-03. `getCurrentUser.ts` (`.eq('id', userId)`, line 17) is in A-02's touch list. |
| Blocker 2: email sign-in across browsers | **Fixed** | A §3.8: "**Email links use a new `app/auth/confirm/route.ts`** … The Supabase **Magic Link** and **Confirm signup** email templates … link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` … `/auth/confirm` (GET) reads `token_hash` and `type`, calls `supabase.auth.verifyOtp({ type: 'email', token_hash })` on the server client (which sets the session cookies in **this** browser, whichever it is)". `confirm.test.ts` covers "valid token in a browser with no prior cookies … no `exchangeCodeForSession` call on this route". Redirect URLs gain `/auth/confirm**`. Google keeps the PKCE `/auth/callback`, which is correct because Google sign-in starts and ends in the same browser. A-06, A-15, F-A8 and F-A9 are updated. |

**Backward compatibility of the sign-in change: pass.** The existing `/auth/callback` stays, so a magic-link email sent with the old template before the switch still works in the browser that requested it. Only the template and the new route are added.

### Round-2 should-fix items and notes

| Item | Status | Evidence |
|---|---|---|
| 3: `/ingest` forwarded the Referer and cookies | **Fixed** | A §3.9: "**The `/ingest` proxy is a route handler, not a rewrite** … forwards … only the request body and the headers `content-type`, `content-encoding`, `user-agent` … and the client IP … and drops every other header, including `referer`, `cookie` and `authorization`. Responses are passed back without `set-cookie`." Tested in `ingestProxy.test.ts`. The `next.config.ts` rewrite is gone. |
| 4: interrupted account deletion | **Fixed, one gap** | C §3.9: a daily Vercel cron (`CRON_SECRET`) "re-runs steps 2–5 … at most about 24 hours … Sentry alert" after 48 h; markers are purged only once the auth user is gone. Gap: see should-fix 1 below. |
| 5: retention vs decision 0001 | **Fixed** | A C-A16: "Write an amendment to 0001 (or a decision 0003) … until then the job is created but not scheduled." Also in the tasks file, "Before any building starts" item 4. |
| 6: shared-file order | **Fixed** | Tasks line 59 now orders `seed.sql`, `testDatabase.ts`, `features/account/actions.ts`, both auth routes, `admin.ts` (A-05 → B-06 → C-05), `.env.example`, `tripSave.test.ts` and `noUpdates.test.ts`. B-06 depends on A-05; C-05 depends on A-06. `next.config.ts` is now edited only by C-09. |
| 7: `get_trip_status` exposed keys | **Fixed** | B §4.3: `get_trip_status` returns "`'private' \| 'removed' \| null` (the word only)", and the key comes from "`get_unavailable_trip_key` … service_role only". `questStatus.test.ts`: "anon gets only the word, never a key; `get_unavailable_trip_key` refused to anon and authenticated". |
| 8: `deleted_accounts` RLS | **Fixed** | C §5: "RLS on, no policies, no grants to `anon`/`authenticated`; `access.test.ts` asserts both can neither read nor write them" (also covers `retired_handles`). |
| 9: geocoder negative caching | **Fixed** | A §3.4: "'no result' **only when Nominatim answered 200 with an empty list**; timeouts, 429s and 5xx answers are never cached". |
| 10: `geocoder_calls` on account deletion | **Fixed** | C §3.9 step 3 lists "their `geocoder_calls` rows". |
| Founder 4: drafts start on Next | **Moved to the founder** | A F-A12, with a recommendation and an alternative. |
| Notes 11–15 | **Fixed or decided** | 11: `capture_heatmaps`, `capture_dead_clicks`, `capture_exceptions`, `capture_performance` are off. 12: plain claim vs hash is now CTO item C-C7 (hash recommended). 13: card staleness accepted. 14: B-06 checks Resend's day boundary. 15: A §14 keeps the Nominatim re-check. |

### Do the fixes add new problems?

| Area | Result | Notes |
|---|---|---|
| Decision 0001 | Pass | `deleted_accounts` and `retired_handles` are insert-only with RLS and no grants. The finish-deletions job only inserts markers and runs hard deletes for a user's own deletion request (rule 7). Retention deletes wait for the amendment (C-A16). No `UPDATE` anywhere. |
| Backward compatibility | Pass | Migration 8 now leaves Quest pages, profiles and the sitemap working on its own, proved by `migration8.test.ts`. `/auth/callback` is unchanged for Google and old emails. `get_trip_status` is new, so its return shape can still change freely. |
| Security / RLS | Pass | `get_unavailable_trip_key`, `list_pending_deletions` and `delete_account_data` are service-role only. The cron route needs `CRON_SECRET`. `/auth/confirm` redirects through `safeNext()`. |
| Vercel cron + `CRON_SECRET` | Pass, two notes | Hobby allows one run a day, which the spec states ("at most about 24 hours"). Vercel sends the bearer header itself when `CRON_SECRET` is set. See notes 5 and 6. |
| `/ingest` route handler | Pass, one should-fix | Fixed upstream host and a header allowlist. Restrict the forwarded paths (should-fix 2). |
| `get_trip_status` / `get_unavailable_trip_key` | Pass | The admin client is called only on the server for private/removed pages, and the key is never sent to the browser. |
| Task order | Pass, one should-fix | `.env.example` misses A-07 (should-fix 3). |

---

### For the founder (product)

1. **[Blocking] F-A1:** PRD M3 "12 photos over 3 days → 3 pages" can't pass with 3 photos per page.
2. **[Blocking] F-B1:** PRD M10 "count goes up by 1" contradicts screen 9's "hidden below 3 likes".
3. **[Should fix] F-A9 blocks A-15**, the in-app browser screen copy and order. **F-A12**: confirm drafts start on Next.
4. **[Note]** The remaining recommended founder items (F-A2–F-A8, F-A10, F-A11, F-B2, F-B3, F-C1–F-C6) need answers before the tasks that use them start, not before CTO approval.

### For the Tech Lead / builders (technical)

No blocking findings.

**Should fix (fold into the owning task; no new spec round needed)**

1. **[Should fix] A failed auth-user deletion can skip the cache refresh for good** (C §3.9 step 4 and "Finishing interrupted deletions", line 121).
   - The refresh lists (other people's Quests the user commented on, follow profiles, own slugs) come from step 3's return value, and the spec doesn't say whether step 5 still runs when step 4 fails after its retries.
   - When the cron "re-runs steps 2–5", step 3 finds nothing left to delete and returns **empty lists**, so the re-run refreshes nothing.
   - If the first attempt stopped at step 4, the deleted person's name, photo and comments stay in cached `trip-social` pages. That's round-1 blocker 4 coming back on the failure path.

   *Fix (C-05):* run step 5 straight after step 3, before deleting the auth user, or store step 3's result in an insert-only `deleted_accounts` row so the cron can replay it. Add a test that the cron path refreshes the same tags.
2. **[Should fix] Limit which PostHog paths `/ingest` forwards** (A §3.9, line 207: forwards to `https://{POSTHOG_HOST}/{path}`). Build the upstream URL from the fixed host plus an allowlist of prefixes (`e/`, `i/v0/e/`, `batch/`, `decide/`, `flags/`, `array/`, `static/`), and reject everything else with 404. Otherwise the endpoint relays any request to any PostHog path. (A-07, `ingestProxy.test.ts`.)
3. **[Should fix] A-07 doesn't touch `.env.example`, but adds `POSTHOG_HOST`** (and the PostHog keys). Add A-07 to the `.env.example` order (A-05 → A-07 → B-06 → C-05), or have A-05 add all of A's variables.
4. **[Should fix] `vercel.json` already has `git.deploymentEnabled`** (skipping deploys for `spec/**`, `review/**`, `dependabot/**`). C-05 must **add** `crons` next to it, not replace the file. Say so in C-05's "done when".

**Notes**

5. [Note] The cron route compares `CRON_SECRET` in constant time (as the unsubscribe token does), and returns 401 without logging the header.
6. [Note] Vercel crons run only on production deployments, so the finish-deletions path can't be exercised on preview. Test the route by hand on preview with the bearer header.
7. [Note] `/auth/confirm`: if Supabase ever falls back to the Site URL (a `redirectTo` that isn't allowlisted), `{{ .RedirectTo }}&token_hash=…` produces a malformed link. The redirect-URL runbook prevents this, and A-06's test should use the exact allowlist entries.
8. [Note] Every PostHog request is now a Vercel function invocation. That's well inside Hobby's quota at friends-test volume; watch it if traffic grows.

---

### Coverage, security, no in-place updates, backward compatibility

Unchanged from round 2 except for these rows, which now pass:

- **M1/M10/M11 from in-app browsers:** the email path works through `/auth/confirm`.
- **Unlisted URLs not leaked:** `/ingest` route handler.
- **Migration order:** migration 8 is safe on its own.
- **Account deletion:** daily completion (one gap, should-fix 1).
- **`deleted_accounts` RLS.**

### Verdict

**PASS for the technical plan (round 3 of 3).** The spec set is ready for CTO approval as soon as the founder answers F-A1 and F-B1. Should-fix items 1–4 become conditions on C-05 and A-07.

### Still for the CTO to decide or do

1. C-A12: retention ages. C-A16: a human writes the 0001 amendment (or decision 0003) before the weekly job is scheduled.
2. C-C1: feed score constants. C-C7: plain username claim or hash after account deletion (hash recommended).
3. C-C8: accept the once-a-day cron limit ("at most about 24 hours").
4. Supply `GEOCODER_CONTACT_EMAIL` and `CRON_SECRET`; apply the two custom Auth email templates and both redirect URLs on prod and preview (A-06 runbook).
5. Sign off on the recommended items still listed as open: C-A1–C-A4, C-A8, C-A10, C-B1, C-B2, C-B4, C-B5, C-C2, C-C3, C-C5, C-C6.
6. After approval, a human edits CLAUDE.md (C-A10).

### Tracker update (no Sheets access from here; for a human to apply)

Technical review passed. Until F-A1 and F-B1 are answered, the row is `Blocked`, Owner `Founder`, Notes: "Plan review round 3: technical PASS; founder F-A1 (M3) and F-B1 (M10) open". Once answered (and the PRD copy in `docs/prds/` is updated by the founder/Product agent), move it to `6. Spec approval (CTO)`, Owner `CTO`, with should-fix 1–4 noted as task conditions.
