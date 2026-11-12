# Plan review: OnQuest MVP, round 2

## Plan review: CHANGES NEEDED (round 2 of 3)

Reviewed on `spec/onquest-mvp` at `12a897f` (the Tech Lead's round-2 revision, on top of round 1 at `1f8b9fa`), 10 Nov 2026. No GitHub PR exists, so this file stands in for the spec-PR comment.

I read the three revised specs in full, the task list, the HLD and docs/03 diffs, and the `docs/analytics/*.csv` exports again. I also re-read the code the migrations touch: `supabase/seed.sql`, `supabase/migrations/2026103100000{1,3,5}_*.sql`, `tests/db/testDatabase.ts`, `app/auth/callback/route.ts` and `features/account/actions.ts`. As in round 1, I didn't run checks (a plan review covers documents) and couldn't open Nominatim's, Resend's or Vercel's live terms.

**Summary.** The revision is good. All seven round-1 technical blockers are fixed, and most should-fix items and notes are fixed too, with tests named for each. Two new blocking problems came in with the fixes, both small:

1. Migration 8 renames `profiles.id` but leaves the seed file and the three public functions that use it for migration 9.
2. The magic-link fallback for in-app browsers can't work with the current PKCE sign-in callback.

The founder's two PRD contradictions (F-A1, F-B1) are still open.

---

### Round-1 blockers: status

| Round 1 | Status | Fixing text (quoted) |
|---|---|---|
| Founder 1: M3 can't pass | **Open (founder, F-A1)** | A §2: "**Can't hold with 3 photos per page; founder decision F-A1**" |
| Founder 2: M10 vs S3 | **Open (founder, F-B1)** | B §14 F-B1 unchanged |
| Tech 1: foreign-key inventory | **Fixed** | A §5 item 2: "**Foreign keys first, before any function that deletes a profile row:** drop `trips_owner_id_fkey` and `photos_owner_id_fkey` … re-create them as … `on delete no action deferrable initially deferred`." Item 3: "drop `trips_cover_photo_fk` … drop `photos_trip_id_fkey`, `places_trip_id_fkey`, `places_photo_id_fkey` …". The inventory table follows. Tests: "**a profile save deletes nothing else**", "**publish with a cover photo key that isn't in the legacy `photos` table succeeds**". B §5 and C §5 name their keys the same way. I checked this against `20261031000001_tables.sql`: every existing foreign key is covered. (Migration order has a new problem, see new blocker 1.) |
| Tech 2: column carry-over | **Fixed** | A §3.10: "**copy every column of the current live row, override only the named fields, and insert with an explicit column list.** … Migration 9 drops the defaults on `trips.seed`, `trips.visibility`, `trips.status` and `trips.comments_on`". Carry-over table per function. Tests: "`seed`, `comments_on`, `published_at`, `slug` unchanged after publish, visibility change and comments switch". |
| Tech 3: `get_trip` contract | **Fixed** | A §4.3: "Output built from an **explicit field list** (§4.1), never `to_jsonb(t)` … every absent optional value is emitted as JSON `null`". §4.1: `status`, `word_count` kept; `places[].photo_id` kept via `TripPlaceSchema.photoId`; `key`, `saved_at`, `comments_on` are `.optional()`. §8 adds a deploy-order row. `getTrip.test.ts` does "**deep equality** of every field the old `get_trip` returned". |
| Tech 4: account-deletion cache | **Fixed** | C §3.9 step 3: "It **returns what to refresh**: `liked_or_commented_trip_keys` …, `follow_profile_keys` …, `own_trips` …, `handles`". Step 5 refreshes `trip-social`, `profile`, `profile-url`, `trip-url`, `explore`, `guide-quests`. Tested in `accountDelete.test.ts`. |
| Tech 5: analytics vs CSVs | **Fixed** | A §3.9: "**Names, properties and allowed values come from `docs/analytics/*.csv`** … a test fails if code sends an event, a property or a value not in the CSVs." I re-checked every row of A §10, B §10 and C §10 against `client-events.csv` and `server-events.csv`: names, properties and allowed values now match (`QuestCreateSource`, `quest_draft_created` on Next, `quest_arranged.duration_ms`, `quest_viewed` without `referrer`, `setFollow.source`, `quest_link_shared` sources, `format: all` + `slides`, page-count bounds). The two missing events are listed as "Sheet change requests" and are not sent until the sheet adds them. |
| Tech 6: in-app browser sign-in | **Mostly fixed** | A §3.8: "`lib/auth/inAppBrowser.ts` detects them … an in-app browser gets the **"Open in your browser"** screen". Android has an `intent://` link to Chrome; iOS has steps and Copy link. Task A-15 and founder decision F-A9 cover it. The **email-link option on that screen won't work** as designed: see new blocker 2. |
| Tech 7: PostHog defaults | **Fixed** | A §3.9 config: "`autocapture: false` … `capture_pageview: false` … `disable_session_recording: true` … `before_send: allowlistProperties`", pageviews send path templates only, and the allowlist drops `$current_url`, `$referrer` and `$initial_*`. Sentry: "`sendDefaultPii: false`; `beforeSend` and `beforeBreadcrumb` scrub …". Tested in `events.test.ts` and `sentry.test.ts`. (One leak remains through the proxy: should-fix 3.) |

### Round-1 should-fix items and notes the revision says it fixed

All verified fixed, each with its fixing text:

- **8 Nominatim:** A §3.4 adds a Postgres cache and limiter, sequential lookups inside a 5 s budget, an ownership check plus 10 lookups / 20 searches per user per 10 minutes, submit-only search, `zoom=10`, a User-Agent with `GEOCODER_CONTACT_EMAIL`, and OSM attribution.
- **9 Vercel Hobby:** recorded as an accepted risk (C-A9, HLD §1).
- **10 Email budget:** B §3.5 "Daily email budget".
- **11 Re-publish visibility:** A §3.6 adds both conflict checks and prefills the current visibility on re-publish.
- **12 Stale listings:** `explore` and `guide-quests` are now refreshed on publish, visibility change and delete.
- **13 Profile edits:** comments elsewhere are refreshed, and old avatar files are kept.
- **14 Account deletion:** described only in C; A §5 now says "explicit deletes, no cascades".
- **15 Failed auth deletion:** a `deleted_accounts` marker plus retry (but see should-fix 4).
- **16 Avatar URL:** the action takes `avatarPhotoId` and builds the URL on the server.
- **17 Captions input:** `writeCaptions({ key, basedOn })` reads from the stored draft.
- **18 Photo sweep:** skips objects under an hour old; the archive trade-off is stated.
- **19 Concurrent saves:** "re-reads by key, and if a row exists it raises `OQ409`", with a test.
- **20 Archive constraints:** primary key `(key, saved_at)`, no other constraints.
- **21 Row metadata and tests:** `saved_by`/`save_reason` on insert-only tables; `noUpdates.test.ts` for every table.
- **22 Profile cache misses:** new `profile-url:{handle}` tag.
- **23 Sentry:** scrubbing configured.
- **24 E2E login route:** also requires `VERCEL_ENV` undefined; the test user lives in `seed.e2e.sql`.
- **25 Task list:** dependencies and shared-file order added (gaps remain, should-fix 6).
- **26 Retention:** pg_cron job; ages pending C-A12.
- **Notes:** 27 (cost table), 28 (preview project on Pro), 29 (`published_from` replaced by the explained `published_draft_saved_at`), 30 (`concat_ws`), 31 (constant-time HMAC with a key version), 32 ("Open your Quest" for the owner), 33 (docs/03), 34 (link text asserted in the export frame), 35 (`startedAt`), 36 (no slug reuse over tombstones), 37 (`comment_key` has no foreign key), 38 (redirect-URL runbook).

**Decision 0001 compliance of the new tables** (`email_send_log`, `geocode_cache`, `geocoder_calls`, `deleted_accounts`, both limiters): **pass.** All are insert-only, carry `saved_at`/`saved_by`/`save_reason`, have no update grants, and are covered by `noUpdates.test.ts`. Both limiters (`claim_geocoder_slot`, `claim_email_budget`) take `pg_advisory_xact_lock` inside one short transaction, count rows and insert one, with no counter row to update and no sleep while holding a connection. The spec rightly rejects a single-row counter because it would need an `UPDATE`. The only 0001 question left is retention (should-fix 5).

**Founder side.** I accept F-A11's argument against my round-1 allowlist suggestion: an allowlist would also stop friends from signing in to like and comment. A `SIGNUPS_OPEN` kill switch is the better fit. The founder chooses.

---

### For the founder (product)

1. **[Blocking] F-A1:** PRD M3 "12 photos over 3 days → 3 pages" can't pass with 3 photos per page. (Unchanged from round 1.)
2. **[Blocking] F-B1:** PRD M10 "count goes up by 1" contradicts screen 9's "hidden below 3 likes". (Unchanged.)
3. **[Should fix] F-A9 blocks A-15:** confirm the in-app browser copy and add the Instagram-story UX check. Don't make "Email me a sign-in link" the first option until new blocker 2 is fixed.
4. **[Should fix] New: drafts now start on Next, not on the first pick** (A §3.2, line 101). The PRD edge case (line 265) says "Leaving mid-creation: The draft is saved and appears on Home with a Draft tag". Someone who leaves on Pick photos now gets only a "Pick up where you left off?" offer on the same phone, and nothing on Home or on another device. This matches the taxonomy (`quest_draft_created` fires on Next). Confirm it's acceptable.
5. **[Note]** F-A10 (undated photos), F-A11 (rollout flag), and F-A2–F-A8, F-B2, F-B3, F-C1–F-C6 are still open, each with a recommendation.

### For the Tech Lead (technical)

**Blocking (new)**

1. **[Blocking] Migration 8 renames `profiles.id` but leaves the seed and the three public functions for migration 9** (A §5 item 2, line 432; task A-02, line 581).
   - `supabase/seed.sql` line 13 does `insert into public.profiles (id, handle, …)`, and `tests/db/testDatabase.ts` (line 53) runs the seed after the migrations. Once migration 8 renames the column, every database test in A-02's PR fails.
   - `get_trip`, `get_profile` and `list_sitemap_trips` (`20261031000005_trip_photo_folder.sql`, `20261031000003_public_functions.sql`) are `language sql` functions whose bodies use `p.id` / `profiles.id`. Postgres stores those bodies as text, so a column rename doesn't rewrite them, and they fail at call time until migration 9 replaces them.
   - Because A-02 merges (and its migration can be pushed to the preview project) before A-03, **every Quest page would return errors between 8 and 9**. That contradicts A §8: "Quest pages render either way".
   - A-02's touch list has no `seed.sql` and no `get_*`; A-03 owns both.

   *Fix (either one):*
   - (a) Migration 8 also replaces the three `get_*` functions for `profiles.key` (same output), and A-02 owns the `seed.sql` change for `profiles`.
   - (b) Migration 8 does only the foreign-key changes, the new tables and the functions written against `profiles.id`, and the `profiles.id → key` rename moves to migration 9 alongside the trips renames.

   Either way, add a test that the seed trip renders through `get_trip` after migration 8 alone.
2. **[Blocking] The magic-link fallback for in-app browsers can't work with the current PKCE callback** (A §3.8, line 170: "the emailed link opens in the system browser and carries `next` there"; F-A8/F-A9 make it the recommended first option).
   - The sign-in action (`features/account/actions.ts`) calls `signInWithOtp` through `@supabase/ssr`, which uses the PKCE flow. `app/auth/callback/route.ts` then calls `exchangeCodeForSession(code)`, which needs the code verifier cookie set **in the browser that asked for the link**.
   - When the link is requested from Instagram's in-app browser and opened in Safari or Chrome, that cookie is missing, so the exchange fails and the person lands on "Sign-in didn't work". That's exactly the group blocker 6 was about.

   *Fix:* a custom magic-link email template that links to `/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=…`, and an `/auth/confirm` route that calls `verifyOtp({ type: 'email', token_hash })`. That works across browsers. Keep `next` safe with `safeNext()`. Add the route to A-06/A-15, the template to `docs/runbooks/auth.md`, and a test.

**Should fix**

3. **[Should fix] The `/ingest` rewrite forwards the page URL and cookies to PostHog** (A §3.9, line 182).
   - posthog-js requests to our own origin carry a same-origin `Referer` with the full page URL (for example `/@riya/goa-trip-k3f9x2`), plus our Supabase cookies. A `next.config.ts` external rewrite passes request headers on to PostHog.
   - The property allowlist doesn't cover headers, so unlisted URLs and auth cookies reach the vendor.

   *Fix:* make `/ingest/[...path]` a route handler that forwards only the body, `content-type` and the client IP header (for GeoIP), and drops `referer` and `cookie`. Add a test.
4. **[Should fix] An interrupted account deletion finishes only at the next sign-in** (C §3.9 step 4, lines 116–119). Someone who deletes their account usually never signs in again, so their `auth.users` row (with their email) can stay forever. The `deleted_accounts` marker is also "purged with the 180-day archives", which can happen before the deletion finishes. *Fix:* the weekly job (or a cron route using the admin client) finishes every pending marker, and markers are purged only after `auth.users` has no row for that key.
5. **[Should fix] Retention deletes archived published Quests and profiles, which decision 0001 doesn't allow yet** (A §3.1, line 63; C-A12).
   - 0001 rule 7 allows real deletes only for a user's trip or account deletion.
   - Its open question says "archived published rows kept until the user deletes the trip".
   - `run_retention_cleanup` deletes `trips_archive` and `profiles_archive` rows after 180 days.

   *Fix:* the CTO confirms the ages (C-A12), and 0001 gets a human-written amendment (or a 0003 decision) adding "retention cleanup of archive rows" as a permitted delete. Agents can't edit decisions.
6. **[Should fix] The shared-file order has gaps** (tasks line 59; A §12 line 596). These pairs edit the same file with no order:
   - `app/auth/callback/route.ts`: A-06 and C-05 (C-05 doesn't depend on A-06).
   - `lib/supabase/admin.ts`: created by A-05, B-06 ("if not yet present") and C-05, but B-06 doesn't depend on A-05.
   - `tests/db/tripSave.test.ts`: extended by B (B §5) but missing from B-01's touch list.
   - `.env.example`: A-05 and B-06.

   *Fix:* add A-06 → C-05 and A-05 → B-06 → C-05; add `tripSave.test.ts` to B-01.
7. **[Should fix] `get_trip_status` now returns `trip_key` to anonymous callers** (B §4.3, line 128). That contradicts docs/03 ("it returns only the word, never content") and B line 139 ("A Quest key is … only reachable through its URL, feeds … or analytics"). Anyone with the publishable key can get a private or deleted Quest's key by calling the RPC directly. It's low value today, but it widens what keys can reach later. *Fix:* keep the public function returning the status word only, and read the key for `quest_unavailable` with a service-role-only `get_unavailable_trip_key(handle, slug)`.
8. **[Should fix] `deleted_accounts` has no RLS or grants rule stated** (C §5, line 218, and §7). CLAUDE.md requires RLS on and a test for every new table. *Fix:* RLS on, no policies, no grants to `anon`/`authenticated`, and an access test.
9. **[Should fix] `geocode_cache` caches "no result" forever** (A §3.4, line 125). If a Nominatim timeout, 429 or 5xx is stored as "no result", that town never gets a name again. *Fix:* cache only a successful empty response, and test it in `geo.test.ts`.
10. **[Should fix] `delete_account_data` doesn't list `geocoder_calls`** (C §3.9, line 115). The table holds `user_key`. With 1-day retention the exposure is small, but M26 says everything is removed. *Fix:* add it, or state the exception.

**Notes**

11. [Note] Also turn off posthog-js's other default capture: `capture_heatmaps`, `capture_dead_clicks`, `capture_exceptions` and `capture_performance` (web vitals). The allowlist strips their properties, but the events would still be sent and counted.
12. [Note] `handle_claims` keeps the plain handle and the deleted user's key forever (C-C5). Matching on `sha256(handle)` for deleted accounts would block reuse while keeping less personal data. CTO's call; the privacy policy must say which (F-C6).
13. [Note] Explore (5 min) and guide (1 h) cards show the owner's name and avatar, and a profile edit doesn't refresh them. That much staleness is acceptable.
14. [Note] The email budget assumes Resend counts its daily limit per UTC day. I couldn't verify this; B-06 should check.
15. [Note] The A-05 builder still has to re-check Nominatim's current policy (A §14 already says so).

---

### Coverage

Unchanged from round 1 except for these rows:

| PRD criterion | In spec? | Implemented by | Tested by |
|---|---|---|---|
| M1, M10, M11 from in-app browsers | Yes (email path broken, blocker 2) | A-06, A-15 | `inAppBrowser.test.ts`, Instagram-story UX check |
| M14 survives re-publish | Yes (new row) | `publish_trip` carry-over | `tripSave.test.ts` |
| UX task 3 "nothing else moved" | Yes (new row) | seed carry-over | `tripSave.test.ts` |
| Edge: leaving mid-creation | Partly (founder 4) | IndexedDB before Next, draft after | B-11 |
| M3 row 1, M10 | Founder (F-A1, F-B1) | — | — |

### Security and privacy

| Rule | Planned correctly? | Notes |
|---|---|---|
| RLS + db test on every new table | Mostly | `deleted_accounts` not stated (should-fix 8) |
| No anonymous select | Yes | |
| Public functions return only published public/unlisted | Mostly | `get_trip_status` exposes keys (should-fix 7) |
| No GPS stored | Yes | Rounded before the server; cache keyed by rounded points; Sentry scrubs |
| No user text in logs or analytics | Yes | PostHog config and allowlist; Sentry scrubbing |
| Unlisted URLs not leaked | **Partly** | Referer and cookies through `/ingest` (should-fix 3) |
| Secret key only in `lib/supabase/admin.ts` | Yes | Geocoder, retention, email and deletion all import it from there |
| Email links | Yes | HMAC with a key version, constant-time compare |
| Account deletion | Mostly | Cache refresh fixed; completion and log gaps (should-fix 4, 10) |
| Test-only login | Yes | `VERCEL_ENV` gate, local-only seed |

### No in-place updates

| Record | Key | Save function | Conflict check | User delete | OK? |
|---|---|---|---|---|---|
| `profiles` | auth id | `save_profile`, `save_profile_settings`, `_as_admin` | Yes (admin: none) | Yes | Yes (but migration 8 order, blocker 1) |
| `trips` | key | publish, visibility, comments, delete | Draft **and** trip `saved_at` | Yes | Yes |
| `trip_drafts` | trip key | `save_trip_draft`, `writeCaptions` through it | Yes; concurrent → `OQ409` | Yes | Yes |
| `likes`, `follows` | key | set-state (C-B1) | By design none | Yes | Yes |
| `comments`, `notifications`, `notification_reads` | key | as round 1 | — | Yes | Yes |
| `email_send_log`, `geocoder_calls`, `geocode_cache`, `deleted_accounts`, `handle_claims`, `removed_trip_urls` | key / cache key / handle / hash | Insert-only | — | Logs aged out; claims and tombstones kept | Yes |
| Retention deletes | — | `run_retention_cleanup` | — | — | Needs a 0001 amendment (should-fix 5) |

### Backward compatibility

| Area | Safe? | Notes |
|---|---|---|
| Stored content | Yes | Only optional fields; old-shape fixture |
| `get_trip` | Yes | Explicit list, aliases, optional new fields, deep-equality test |
| Migration order | **No** | Migration 8 alone breaks the seed and `get_*` (blocker 1) |
| Rollback | Accepted (C-A2) | The previous release's onboarding breaks; reads keep working |
| URLs | Yes | Slugs fixed; handles never reused; old handles redirect with 308 |
| Rendering | Changes, accepted | `seed` carried; `jitter` unchanged |
| Storage | Yes | Paths unchanged; old avatars kept |
| Analytics | Yes | Matches the CSVs |

### Verdict

**CHANGES NEEDED (round 2 of 3).** The CTO can approve once:

- the Tech Lead fixes new blockers 1 (migration 8 vs the seed and `get_*`) and 2 (cross-browser magic link). Both are small and local;
- the founder answers F-A1 and F-B1.

Should-fix 3–10 can land in the same revision, or as conditions on the tasks that own them (A-02, A-06/A-15, A-07, B-01, C-03, C-05). Should-fix 3 and 4 matter most for privacy.

### Still for the CTO to decide

1. C-A12: confirm the retention ages, and amend decision 0001 (human edit) to allow retention deletes.
2. C-C1: confirm the feed score constants `(hours + 6)^1.2`, comments × 0.5.
3. Supply the `GEOCODER_CONTACT_EMAIL` value.
4. Handle claims after account deletion: plain handle or hash (note 12).
5. Sign off on the remaining recommended items, which are still listed as open: C-A1–C-A4, C-A8, C-A10, C-B1, C-B2, C-B4, C-B5, C-C2, C-C3, C-C5, C-C6.

### Tracker update (no Sheets access from here; for a human to apply)

Row "OnQuest MVP" stays at `4. Tech spec`, Owner `Tech Lead agent`, Notes: "Plan review round 2: 2 blocking (migration 8 vs seed and get_*; cross-browser magic link). Founder F-A1, F-B1 still open." On the founder side the row stays effectively `Blocked` until F-A1 and F-B1 are answered.
