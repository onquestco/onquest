# Plan review: OnQuest MVP (PRD + specs A, B, C + task list)

## Plan review: CHANGES NEEDED (round 1 of 3)

Reviewed on branch `spec/onquest-mvp` at `29a0a7f`, 10 Nov 2026. GitHub access is suspended, so this file stands in for the spec-PR comment.

What I read: `docs/prds/onquest-mvp.md`; `docs/specs/onquest-mvp-a-create.md`, `-b-quest-page.md`, `-c-social.md`, `-tasks.md`; `git diff add-agents-and-ci..HEAD` (HLD, LLD, docs/03, CLAUDE.md/AGENTS.md, design system); `docs/analytics/*.csv`; decisions 0001 and 0002; the existing code (`supabase/migrations/*`, `features/trip-page/getTrip.ts`, `lib/trip/schema.ts`, `lib/trip/toTripData.ts`, `features/account/actions.ts`, `lib/storage.ts`, `proxy.ts`, `next.config.ts`, `templates/registry.ts`); the editor WIP (`editor-wip-ref`: migration 7, `lib/geo.ts`, `image.worker.ts`, `PlaceSearch.tsx`); and the prototype (`arrange()`, the like and comments copy).

What I didn't do: I didn't run `npm test`/`build`, because a plan review checks documents, not code. I couldn't fetch the current Nominatim usage policy (the URL isn't on this session's allowlist), so the Nominatim points below rely on the policy as I know it and must be re-checked by the builder, as C-A7 already says. I couldn't check vendor prices (Haiku 5.5, Resend, Vercel) against their live pages either.

Overall, the specs are thorough. The split by data owner is sound, decision 0001 is applied with care (archive tables, one trip document, a separate draft row, deferred foreign keys), and almost every PRD criterion has an owner and a test. What blocks approval is a short list of concrete defects. Most are in the database migration plan, where a direct implementation of the text as written would delete data or break a contract, plus two contradictions inside the PRD that the founder must settle.

---

### For the founder (product)

1. **[Blocking] PRD Acceptance criteria, M3 row 1 (line 209) can't be met.** "12 photos taken over 3 days → 3 pages, one per day" needs 4 photos on a page, but screen 5 and the prototype hold 3 per page. *Why:* the UX tester would fail M3 every time. *Suggest:* accept spec A F-A1 ("12 photos over 3 days → 4 pages in date order; a page holds one day whenever 5 pages allow"), or allow up to 5 photos per page (this needs new template layouts and changes scope).
2. **[Blocking] PRD M10 (line 224) contradicts screen 9 / S3 (line 168).** M10 expects "the count goes up by 1", but screen 9 hides the count below 3 likes. *Why:* on a new Quest the check can't pass. *Suggest:* accept spec B F-B1 (0 likes → "Be the first to like this"; 1–2 → filled heart and "Liked", no number; 3+ → number) and run M10 on a Quest with 3 or more likes.
3. **[Should fix] Sign-in inside Instagram's in-app browser (PRD Target users line 36, flow "Watch and react" line 123).** Google refuses OAuth inside embedded in-app browsers, and links opened from an Instagram story open in one. The PRD's like, comment and "Make your own" loop assumes Google sign-in works there. *Suggest:* decide the copy for an "Open in your browser to sign in" step, and whether "Email me a sign-in link" is offered first in in-app browsers. (The technical side is Tech Lead item 6.)
4. **[Should fix] Rollout (line 334) says "Behind a feature flag"; spec A C-A5 recommends no flag.** That deviates from the PRD and needs your explicit sign-off. Because the friends test runs on production, I recommend at least a sign-up allowlist (invited emails) from day one rather than "only if strangers appear".
5. **[Should fix] Edge case "Some photos have dates, some don't" (line 259).** The PRD says undated photos "join the nearest page in pick order". Spec A §3.3 rule 4 (line 102) puts them on the last page's free slots and then on new pages. The two produce different Quests. Confirm the spec's rule, or ask for the PRD's.
6. **[Should fix] M21 second check (line 236) and the feed formula.** "A Quest from someone I follow with more likes and comments from the same day sits above it" isn't guaranteed by spec C's time-decay score (C §3.4, line 63): a Quest published 10 hours earlier needs about 18 times the points to stay above a brand-new one. Confirm that "same day" means "published within the same hour or so", or ask for a ranking that sorts by likes and comments within a calendar day.
7. **[Should fix] What happens to a deleted account's username?** Spec C (`handles.test.ts`: "deleted account frees it", line 216) frees it. A new person could then take `@riya`, publish at the same slug, and every WhatsApp link and Instagram export of the deleted user's Quests would open their content. Decide whether a deleted account's usernames are never reused (recommended) or are released after some time.
8. **[Note] Open PRD questions** "Who writes guides?" and "Do new followers trigger notifications?" are still open (F-C1, F-B2). Spec C builds follow emails (C §3.3) on the assumption that the answer to the second is yes.
9. **[Note] UX test plan** covers nothing in the social layer (F-C5). Without the two extra tasks, M21–M27 never get a human pass.
10. **[Note] Scope.** 28 Must stories, 37 tasks, 2 people, about 4 weeks (HLD §1). The release split (1a create, 1b react, 2 social) is the natural smaller first slice; consider starting the friends test on Release 1b if Release 2 slips.

### For the Tech Lead (technical)

**Blocking**

1. **[Blocking] Spec A §5 (line 337) misses existing foreign keys that will delete or block data under delete-and-reinsert.** The existing schema (`20261031000001_tables.sql`) has `trips.owner_id → profiles on delete cascade`, `photos.owner_id → profiles on delete cascade`, `photos.trip_id → trips on delete cascade`, `places.trip_id → trips on delete cascade`, `places.photo_id → photos on delete set null`, and `trips_cover_photo_fk → photos(id) on delete set null`.
   - Migration 8 (A-02) introduces `save_profile`, which deletes the live profile row, but the foreign keys are only re-created in migration 9 (A-03). If A-02 lands alone (it is its own PR, merged and tested before A-03), **every profile save cascades and deletes all of that user's trips and photos.**
   - In migration 9, the first trip save cascades and deletes the legacy `photos`/`places` rows that §5 item 4 keeps "so a rollback is possible".
   - `trips_cover_photo_fk` would reject every new cover photo key (new photos are never written to the `photos` table), so publish fails.

   *Suggest:* migration 8 re-creates `trips.owner_id` and `photos.owner_id` as `no action deferrable initially deferred`. Migration 9 drops `trips_cover_photo_fk` and makes `photos.trip_id`, `places.trip_id` and `places.photo_id` deferred (or drops them, since those tables are no longer written). List every foreign key by name in §5. Add db tests: "profile save keeps the user's trips" (in `profileSave.test.ts`, A-02) and "publish with a cover photo not in the legacy tables succeeds".
2. **[Blocking] Spec A §4.3 (line 298, `publish_trip`/`set_trip_*` rows) doesn't say which columns carry over to the new row.** It says only "insert the new row". Today `trips.seed` has `default floor(random() * 2147483647)` and `visibility` defaults to `'unlisted'`. If an insert relies on defaults, **every publish, visibility change and comments switch reshuffles `jitter`** (breaking CLAUDE.md "Don't change jitter keys…" and UX task 3, "nothing else moved"). Likewise, `publish_trip` builds from the draft, which has no `comments_on`, so re-publishing silently turns comments back on after the owner turned them off (M14). *Suggest:* state the rule: "each save function copies every column of the current live row and overrides only the named fields". List what must survive: `seed`, `slug`, `published_at`, `comments_on`, `word_count`, `visibility` (except `set_trip_visibility`), `published_from`, `created_at`. Add tests that `seed` and `comments_on` are unchanged after publish, visibility change and comments switch. Consider dropping the `seed` default so inserts inside the save functions must pass it.
3. **[Blocking] Spec A §4.1/§4.3 (`get_trip` replaced, lines 222–226 and 310): the compatibility contract is incomplete.**
   - (a) Today's function returns `to_jsonb(t) - 'owner_id'`. On the renamed table, that pattern would also return `owner_key`, `saved_by`, `search_text` and the raw `photos`/`places` documents (with `takenAt` and `date`). The spec must say the `trip` object is built from an explicit field list.
   - (b) Today's `places[]` includes `photo_id` and `toTripData()` uses it (`place.photo`), but the new `TripPlaceSchema` (spec A lines 197–206) has no `photoId`, so a returned field disappears and old trips lose place photos. This breaks CLAUDE.md "never … remove returned fields".
   - (c) `status` and `word_count` are returned today and aren't mentioned.
   - (d) `TripRowsSchema` uses `.nullable()`, which rejects a missing key, so `caption`, `note` and `photo_id` must be emitted as JSON `null` when absent from the document.
   - (e) The new `key` and `saved_at` are added as **required**. If code reaches production before migration 9 (Vercel deploys on merge; tasks line 55 relies on a manual `supabase db push` "right before"), every Quest page fails to parse.

   *Suggest:* list `get_trip`'s exact output fields. Add `photoId` (optional) to `TripPlaceSchema` and backfill it. Make the new `TripRowsSchema` fields `.optional()` until the contract migration. Make the "old `get_trip` output equals new for the seed trip" test (§11) a deep-equality test over every old field.
4. **[Blocking] Spec C §3.9 step 4 (line 113): account deletion leaves the person's name, photo and comments on public pages.** The deleted user's comments and likes on *other people's* Quests are served from `trip-social:{otherKey}`, which is cached with no time limit and refreshed only by writes to that Quest. Their followees' counts sit under `profile:{followeeKey}`. Only `profile:{me}` and the user's own `trip-url` tags are refreshed. *Why:* M26 promises comments are removed, and DPDP erasure must also hold in cached HTML. *Suggest:* `delete_account_data` returns the trip keys the user liked or commented on and the profile keys they followed or were followed by, and `deleteAccount` refreshes `trip-social:{key}` and `profile:{key}` for each. Add a test in `accountDelete.test.ts` that the function returns them.
5. **[Blocking] The analytics contract contradicts the source of truth (`docs/analytics/*.csv`).** A-07's schema test "fails if code sends an event or property not in the file" (spec A §3.9), so these conflicts will stop builders:
   - `createQuest.source` enum `['home','profile','make_your_own','quests_tab','create_menu']` (A line 275) vs the sheet's `home_banner / home_empty / create_menu / quests_tab / quests_empty / make_your_own / ftue / whatis_sheet`.
   - `quest_draft_created` fires on "Next on Pick photos" in the sheet but `createQuest` runs "on first pick" (A line 78). This shifts the "Creation completion" denominator.
   - `quest_arranged.seconds` (A line 406 and the §2 proof for the 60 s target) vs the sheet's `duration_ms` (+ `photos`, `failed`).
   - `quest_viewed.referrer` (B line 106; also the PRD table) isn't in the sheet, which has `owner_id`, `visibility`, `source` (the referrer lives on `app_opened`).
   - `setFollow.source` `profile, quest, explore, feed, followers_list` (C line 155) vs the sheet's `user_followed.source` `profile / quest / explore / search / followers_list / auto` (`feed` isn't allowed, `search` is missing).
   - `quest_link_shared` "from the Quest page share" (B line 293) and the ⋯ "Share link" (C §3.10) vs the sheet's `source: publish_screen / feed`, whose change log says "no share button on a Quest page".
   - `instagram_export_downloaded.format` allows only `all` in the sheet, while B delivers per-image saves.
   - `quest_page_turned.page 0–6` / `total 3–7` and `quest_view_ended.pages_seen 1–7` are exceeded by old test trips split into continuation pages (B §3.1).

   *Suggest:* align each spec item to the sheet, or change the sheet and re-export it in the same PR, and add the corrected values to the action enums.
6. **[Blocking] There is no plan for Google sign-in in in-app browsers (spec A §3.8, spec B §2 M10/M11).** Google blocks OAuth in embedded webviews such as Instagram's (the error is `disallowed_useragent`). Links from Instagram stories (the M17 export puts the URL there) open in that browser, so like, comment and "Make your own" sign-in fail for those viewers. UX task 4 uses WhatsApp, so it won't catch this. *Suggest:* detect in-app user agents (Instagram, Facebook, plus a short list) on `/login`, show "Open in your browser" with a copy-link fallback and the magic-link option, and carry `next`/`ref` through. Add a manual check from an Instagram story to the UX plan. The founder decides the copy (founder item 3).
7. **[Blocking] PostHog defaults would break the privacy rules the spec states (spec A §3.9, §7 line 376; spec B §3.6).** By default, posthog-js sends `$pageview` with `$current_url`/`$pathname`/`$referrer` (the full unlisted path) and autocaptures clicks *with element text* (captions, titles, comments, names), and the project may have session replay on. The spec says "analytics never sends the URL path of unlisted Quests" and "no user text", but configures none of this. *Suggest:* put the client config in the contract: `autocapture: false`, `capture_pageview: false`, `disable_session_recording: true`, `persistence: 'localStorage'`, and a `before_send` that strips `$current_url`, `$pathname`, `$referrer` and `$initial_*` for Quest routes, or for all routes, replacing them with `screen`. Add an `events.test.ts` case that a tracked event on `/@h/slug-k3f9x2` carries no path.

**Should fix**

8. **[Should fix] Nominatim (C-A7, A §3.2 line 93, A line 477): the plan states the right policy but the design can't enforce it on Vercel.** Details:
   - A "queue to 1 request/second" and a cache "by rounded coordinates" kept in process memory don't hold across concurrent serverless instances.
   - §3.2 says "≤ 5 parallel calls (~1 s)", which contradicts the 1/s queue: at 1/s, 5 lookups take about 5 s, the whole 5 s geocoding budget (§9), so a second creator arranging at the same time loses place names (M4).
   - `nameLocations` takes no `key` and has no per-user limit, despite §7 (line 377) claiming "ownership of `key`". One signed-in user can drive our shared User-Agent over the limit, and OSMF may block the app without notice.
   - "place/locality types" are Mapbox terms. Nominatim reverse uses `zoom` (about 10–14 for town level).
   - The WIP `lib/geo.ts` is Mapbox code, so "Keep" in §16 is really a rewrite.

   Keep place search submit-only (as the WIP `PlaceSearch.tsx` is): the policy forbids autocomplete.

   *Suggest:* a persistent cache (Next data cache with a long revalidate, or a cache table, which then needs RLS, a test and a decision on 0001), a global limiter (a Postgres advisory lock or a timestamp check in one function), a per-user limit (for example 10 lookups and 20 searches per 10 minutes), a User-Agent with a contact address (`OnQuest/1.0 (+https://onquest.in; <contact email>)`), `accept-language=en`, an 8–10 s geocoding budget for 5 sequential lookups, and the OSM credit wherever stored place names appear on a map.

   *Fit:* for a friends test of about 100 people (at most 5 lookups per Quest), Nominatim is a reasonable, policy-compliant choice **once those items are in**. Before a public launch, switch to the Geoapify fallback or a paid provider.
9. **[Should fix] Vercel Hobby (C-A9).** Vercel's Hobby plan is for non-commercial personal use. A company's product in a friends test, built by a paid team with the intent to monetize, very likely counts as commercial under their fair-use terms, whether or not it earns money yet. Hobby also allows a single member, so the founder and CTO can't both be on the team. *Why:* a pause or suspension of production during the friends test. *Suggest:* CTO re-checks the current terms. Pro (about $20/month) is cheap insurance. If you stay on Hobby, record the accepted risk in the HLD.
10. **[Should fix] Resend free plan (C-B3, B line 288) shares the 100-a-day cap between notification and sign-in emails.** Resend is also Supabase Auth's SMTP for magic links (B §3.5, F-A8). Once likes and comments use up the day's 100, magic-link sign-in silently fails. *Suggest:* a daily budget in `notify.ts` (stop notification email at about 70 a day and log it, while the bell still works), a Sentry alert when it trips, and upgrade at the first trip. The plan fits a friends test with that guard.
11. **[Should fix] Re-publishing can make a private Quest public without the owner noticing (A §3.6 line 133, `publish_trip` row).** The publish sheet defaults to the *settings* default (Public), even when re-publishing an already published Quest, and `publish_trip` checks only the draft's `saved_at`, never the live `trips` row's. So a stale tab can also undo a visibility change made on another device. *Suggest:* on re-publish, prefill the current visibility. `publish_trip` also takes `p_based_on_trip` and raises `OQ409` on a mismatch.
12. **[Should fix] Unlisted, private and deleted Quests stay listed in caches (C line 170 `explore` 5 min, C line 89 `guide-quests` 1 h).** `setQuestVisibility` and `deleteQuest` refresh neither tag, so a just-unlisted Quest's card, *with its URL*, stays on Explore and guide pages. That contradicts docs/03 "Unlisted: never in search" and makes the unlisted suffix pointless. *Suggest:* refresh `explore` and `guide-quests` on publish, visibility change and delete (also account deletion).
13. **[Should fix] Profile edits leave other people's cached pages stale (C §3.8, §5 line 217).** A name, handle or avatar change refreshes only the user's own tags. Their comments on others' Quests (under `trip-social`) keep the old name and handle. Because "the previous avatar file is deleted after a successful save", those comment lists show broken images until another write. *Suggest:* refresh `trip-social` for the Quests the user commented on, or keep old avatar files (paths never change anyway) and delete them only on account deletion.
14. **[Should fix] Account deletion is described two ways (A §5 line 340 vs C §3.9, and A line 309).** Spec A says children go "via `on delete cascade`" and that "`profiles` and every table cascade on `owner_key`", which contradicts A's own deferred-no-action rule (line 337) and C's explicit `delete_account_data`. *Suggest:* delete those phrases so builders follow one design.
15. **[Should fix] `deleteAccount` step 3 failure (C §3.9).** If `auth.admin.deleteUser` fails after step 2, the email stays in `auth.users` and the person can sign back in to an empty onboarding. *Suggest:* make step 3 retryable (a "pending deletion" marker isn't possible without an update, so retry inside the action and report the failure to Sentry), and test the failure path.
16. **[Should fix] `saveProfile.avatarUrl: string | null` (C line 156) accepts any URL from the client.** It is rendered on public profiles, Quest bylines, comments and the OG card, so users could embed a third-party tracking image or arbitrary content. *Suggest:* accept `avatarPhotoId: uuid | null` and build the URL with `lib/storage.ts` on the server.
17. **[Should fix] `writeCaptions` trusts client-sent items (A line 279).** The spec claims "captions model input is dates + town names only", but the client can send any 60-character string as `place`. *Suggest:* the input is `{ key }`; the server reads eligible photos (date + place name) from the stored draft by key, which also makes ownership real.
18. **[Should fix] Photo-file sweep at publish (A §3.7 line 140) can delete files still being uploaded.** A photo counts only "once its row is in the draft document" (A §6), which happens after upload plus a 1.5 s autosave debounce. The sweep in `after()` deletes "every photo id in neither the published document nor the draft", which includes an in-flight one. It also deletes files that `trips_archive`/`trip_drafts_archive` rows still reference, so restoring an archived row (a 0001 "why") shows broken images. *Suggest:* skip objects created in the last hour, and state the archive trade-off in §3.7.
19. **[Should fix] Under concurrent saves, the second save errors with `not_found` instead of `conflict` (A §4.3 line 298).** With delete plus insert, the second transaction's `select … for update` waits, then finds its row deleted and returns no row, so it reports `not_found`. *Suggest:* when the locked select returns nothing, re-read by key; if a row exists, raise `OQ409`. Add the test.
20. **[Should fix] Archive table constraints aren't specified (A §3.1 "same columns plus `archived_at`").** Copying the live table's primary key or unique constraints (`key`, `(trip_key, user_key)`, `(follower_key, followee_key)`, `(owner_key, slug)`) would reject the second archive row for a key. Likes and follows break on the first like → unlike → like → unlike cycle. *Suggest:* each archive's primary key is `(key, saved_at)`, with no other unique constraints and no foreign keys.
21. **[Should fix] 0001 row metadata and "updates refused" tests.** `notifications`, `handle_claims` and `removed_trip_urls` have no `saved_by`/`save_reason` (0001 rule 6). Only `profileSave.test.ts` asserts that direct `insert`/`update` is refused. *Suggest:* add the columns, and add a test per new table (`trips`, `trip_drafts`, `likes`, `comments`, `follows`, `notifications`, `notification_reads`, every archive) that `authenticated` and `service_role` can't `update`, and that `authenticated` can't `insert`/`delete`.
22. **[Should fix] Profile page cache misses never clear (C §3.7, line 170: `getProfile` tagged `profile:{key}`).** A cached "no such profile" for `/@newname` has no key to tag, which is exactly why `tripUrlTag` exists for trip pages. A person who takes a handle somebody visited earlier gets a stale 404. *Suggest:* add a `profile-url:{handle}` tag, refreshed by `save_profile` for the old and new handle.
23. **[Should fix] Sentry may capture user text and coordinates.** Server-action errors can carry payloads (captions, comments, rounded GPS). Neither the specs nor the HLD say `sendDefaultPii: false` or set up a `beforeSend` scrubber. *Suggest:* add both to A-07 (or a small task), per CLAUDE.md "Don't log user text…".
24. **[Should fix] E2E password-login route gated only by `E2E=1` (B lines 300, 317).** Preview deployments now write to a real Supabase project (C-A9), so a misset variable opens a password sign-in route there. *Suggest:* also require `process.env.VERCEL_ENV === undefined` (never on Vercel), and keep the seeded user out of `seed.sql` for remote projects.
25. **[Should fix] Task list quality (`onquest-mvp-tasks.md`).**
    - "Now" is defined as "no dependency that isn't already merged" (line 27), but A-09, A-11 and C-01 depend on A-08, A-12 depends on B-02, and C-02 depends on C-01, none of them merged.
    - Frontend tasks B-02, A-09, A-11 and A-12 use types from A-01 (`QuestDocumentSchema`, `Day.dateLabel`, `TripData.key`, `QuestCard`) but don't list A-01 as a dependency.
    - These pairs of parallel tasks edit the same file with no order: `proxy.ts` (A-06, C-01), `app/(app)/onboarding/page.tsx` (A-06, C-02), `features/editor/image.worker.ts` (A-10, C-10), `next.config.ts` (A-07, C-09), `lib/demo/sampleSocial.ts` (B-03, C-08), `features/trip-page/getTrip.ts` (B-05, C-05), `lib/social/schema.ts` (B-05, C-04).

    *Suggest:* add A-01 to those dependencies, add order edges (or give one task the shared file), and mark "Now" as "after A-01/A-08/B-02".
26. **[Should fix] Retention and DPDP (B §3.4 line 89; C-C5).** Comments the owner deletes are kept forever "for abuse follow-up", and the commenter can't delete their own comment (Later), so the only erasure path is deleting their account. `removed_trip_urls` keeps `sha256(handle/slug)` after account deletion, which can be reversed for any known handle. *Suggest:* set a retention period for archived comments (for example 90 days), say so in the privacy policy, and either drop tombstones on account deletion or keep them and say so.

**Notes**

27. [Note] Captions cost is stated three ways: §3.5 table "≈ $0.003 (~600 + ~400 tokens)" (A line 121), §9 and C-A6 "≈ $0.0005 (1,500 + 600 tokens)". The decisions table calls Haiku "cheapest", but the §3.5 table shows Gemini cheaper. Fix the table. (I couldn't verify Haiku 5.5's list price.)
28. [Note] HLD §1 budget row lists Resend twice and says "Supabase Pro (prod + preview projects)": a second Pro project adds cost and contradicts v1 PRD §9.1 ("one project… no separate staging"). Say which plan the preview project uses. A free project pauses after a week idle and has 1 GB of storage, about 58 Quests at 17 MB each.
29. [Note] `published_from text` (A line 334) is added without explanation.
30. [Note] The trigram index on `lower(handle || ' ' || name || ' ' || home_city)` (C §3.5) is null whenever `home_city` is null; use `concat_ws`.
31. [Note] The HMAC unsubscribe token (B §3.5): use constant-time comparison and put a key version in the token so `EMAIL_LINK_SECRET` can be rotated.
32. [Note] The owner opening their own private Quest's URL sees "This Quest is private." Use `/me`'s `isOwner` to add "Open your Quest" (→ `/quests/[key]/view`).
33. [Note] `get_trip_status` tells anyone that a private Quest exists at a guessable URL. Acceptable, but say so in docs/03 §A.1.
34. [Note] The M17 proof (B-11) checks only frame size. Add an assertion that each frame contains the Quest's link text.
35. [Note] PRD "Time to publish" is measured "from first photo picked"; `minutes_since_start` starts at `quest_create_started` (A line 406).
36. [Note] A tombstoned slug can be reused by the same owner's next Quest (`slugify` checks only live Quests). Old links would then open the new Quest. Decide whether that's acceptable.
37. [Note] If `notifications.comment_key` gets a foreign key to `comments`, a comment delete (archive with no successor) fails at commit. State "no FK" or "deferred, and delete notifications first".
38. [Note] Supabase redirect URLs must allow `/auth/callback?next=…` on the production and preview domains. Add it to the A-06 runbook.

---

### Coverage

| PRD criterion | In spec? | Implemented by | Tested by |
|---|---|---|---|
| M1 return to Pick photos | Yes | A-06 `safeNext`, callback, onboarding | `next.test.ts`, UX 4 |
| M2 16th photo / Next at 3 | Yes | A-09, `save_trip_draft` | `PickPhotos.test.tsx`, `tripSave.test.ts` |
| M3 ×3 | Yes, **row 1 unsatisfiable** (founder 1) | A-05 `arrangePages` | `arrange.test.ts` |
| M4 ×2 | Yes | A-05 `nameLocations`, `writeCaptions` | `arrange.test.ts`, `captions.test.ts` |
| M5 ×5 | Yes | A-11 `pageEdits.ts`, store undo | `pageEdits.test.ts`, UX 3 |
| M6 | Yes (weak proof: a field change) | A-12, B-04 | `pageEdits.test.ts`, UX 3 |
| M7 | Yes | A-12, B-02 `draftToTripData` | UX 1 |
| M8 unlisted / private | Yes | A-03, B-01 `get_trip_status`, C-04 | `tripSave`, `access`, `questStatus`, `search` tests |
| M9 ×3 (4G, loop, full screen) | Yes | B-02, B-03, B-07 | Lighthouse, `questPlayer`, `questFullscreen` |
| M10 | Yes, **contradicts S3** (founder 2); in-app browser gap (tech 6) | A-06, B-05, B-07 | `likes.test.ts`, UX 4 |
| M11 | Yes; in-app browser gap | A-06, B-07 | UX 4 |
| M12 ×2 | Yes | B-03, `/me` | `meRoute.test.ts`, UX |
| M13 | Yes | B-01, B-06, B-08 | `notifications.test.ts`, `notify.test.ts` |
| M14 | Yes; re-publish turns comments back on (tech 2) | A-04, B-01, B-05 | `comments.test.ts`, UX 5 |
| M15 | Yes | `get_profile`, C-09 | `access`, `profile` tests |
| M16 edit / delete | Yes | A-03, A-04, B-01 | `tripSave`, `tripDelete`, `questStatus` |
| M17 | Yes (link text not asserted) | B-09 | B-11, UX |
| M18, M19, M20 | Yes | C-01, C-02 | component tests, UX |
| M21 ×2 | Yes; ranking check ambiguous (founder 6) | C-04, C-08 | `feed.test.ts`, `HomeFeed.test.tsx` |
| M22 ×2, M27 | Yes | C-03, C-05, C-09 | `follows`, `profile` tests |
| M23, M24 | Yes | C-04, C-06, C-11 | `search`, `searchGuides`, `guides` tests |
| M25 ×2 | Yes | C-03, C-05, C-10 | `handles`, `redirect`, `EditProfileForm` tests |
| M26 ×2 | Yes; cached comments survive deletion (tech 4) | C-03, C-05, B-06 | `accountDelete`, `notify` tests |
| M28 | Yes; stale Explore/guide caches (tech 12) | C-07, A-04 | `tripSave`, `search` tests |
| S2, S3 | Yes | B-06, B-03 | `unsubscribe.test.ts`, `LikeButton.test.tsx` |
| Edge cases (11 rows) | Yes; "mixed dated/undated" differs (founder 5) | A-05, A-10, B-01 | `arrange`, `uploadQueue`, `likes` tests |

### Security and privacy

| Rule | Planned correctly? | Notes |
|---|---|---|
| RLS on every new table + db test | Yes | Owner select only; writes only through functions. Add "update refused" tests per table (tech 21) |
| No anonymous `select` policy | Yes | Public reads through `get_*`/`list_*`; docs/03 §B.2 updated; CLAUDE.md edit is for a human (C-A10) |
| Public functions return only published public/unlisted | Mostly | `get_trip` field list must be explicit (tech 3a) |
| Writes via `action()` + zod + `getUser()` | Yes | `nameLocations`/`writeCaptions` ownership not real (tech 8, 17) |
| Secret key only in `lib/supabase/admin.ts` | Yes | Email, unsubscribe, account deletion import it from there |
| No GPS stored | Yes | In memory only, rounded to 2 decimals before the server; stored points are town centres (F-A5). Sentry scrubbing missing (tech 23) |
| `takenAt`/`date` owner-only | Planned | Depends on the explicit `get_trip` list (tech 3a); C's card builders must exclude them too |
| No user text in logs or analytics | **No** | PostHog autocapture and URL properties (tech 7); Sentry (tech 23) |
| Unlisted never listed or leaked | **No** | Explore and guide caches (tech 12); URL in PostHog (tech 7); visibility change keeps the guessable URL (F-A4, founder to accept) |
| `dangerouslySetInnerHTML`, JSON-LD | Yes | Guides parsed to elements; JSON-LD escapes `<`; email HTML escaped |
| Email unsubscribe token | Yes | HMAC, one switch per token, RFC 8058 one-click; add constant-time compare and key version (note 31) |
| anon_id / PostHog | Decided (C-A8) | Privacy policy must change before the test (F-C6); a localStorage device id is personal data under DPDP; say so in the notice at sign-up |
| Account deletion | **Partly** | Rows, files and auth user are covered; cached pages (tech 4), handle reuse (founder 7), retention (tech 26) aren't |
| Open redirect | Yes | `safeNext()` |
| Cost abuse | Partly | Captions bounded; geocoder not (tech 8) |
| Test-only login | Partly | Tech 24 |

### No in-place updates

| Record | Key | Save function | Conflict check | User delete | OK? |
|---|---|---|---|---|---|
| `profiles` | auth user id | `save_profile`, `save_profile_settings_as_admin` | `saved_at` (admin: none, accepted) | `delete_account_data` + auth delete | **No**: FK cascade during migration 8 (tech 1) |
| `trips` (published doc) | `key` | `create_trip`, `publish_trip`, `set_trip_visibility`, `set_trip_comments`, `delete_trip` | Yes, but publish ignores the trip row (tech 11) | Live + archive + files | **No**: column carry-over (tech 2), FKs (tech 1) |
| `trip_drafts` | trip `key` | `save_trip_draft` | Yes | With the trip | Yes (race: tech 19) |
| `likes` | `key` (new per like) | `set_like` (set-state, C-B1) | None by design | Both sides deleted | Yes, if the archive has no unique (tech 20) |
| `comments` | `key` | `post_comment`, `delete_comment` | None (no edits) | Yes | Yes; retention (tech 26) |
| `follows` | `key` | `set_follow` (set-state) | None by design | Both directions | Yes, if the archive has no unique (tech 20) |
| `notifications` | `key` | Insert-only | — | Yes | Mostly; no `saved_by`/`save_reason` (tech 21) |
| `notification_reads` | user key | `mark_notifications_seen` (monotonic) | Not needed | Yes | Yes |
| `handle_claims`, `removed_trip_urls` | handle / url hash | Insert-only | — | Claims deleted; tombstones kept | Decision needed (founder 7, tech 26) |
| `photos`/`places` (legacy) | — | Not written | — | Must be in `delete_trip`/`delete_account_data` | Clarify (tech 1) |
| Grep rule | — | `.update`/`.upsert` removed from `setHandle` (A-02) and the WIP bodies are dropped | — | — | Yes |

### Backward compatibility

| Area | Safe? | Notes |
|---|---|---|
| Stored `trips.content` | Yes | Only optional fields; limits unchanged; old-shape fixture planned |
| Drafts | Yes | Backfill into `trip_drafts`; no real drafts exist; old tabs of the unmerged WIP don't exist in prod |
| Migrations, expand → contract | **Accepted break** | Renames and grant revokes in one release (C-A2). The previous release's onboarding breaks on rollback. Acceptable with no real users, but the profile-save cascade (tech 1) turns it into data loss |
| Rollback | Weak | The legacy tables are claimed as a safety net, but the cascade would empty them (tech 1) |
| `get_trip` | **No** | `places[].photo_id` dropped, `status`/`word_count` unmentioned, required new fields (tech 3) |
| `get_profile`, `list_sitemap_trips` | Yes as specified | Old fields kept; assert them in `profile.test.ts` |
| Public URLs | Yes | Slug fixed at first publish; old handles redirect with 308; `followers`/`following` added as reserved slugs. Handle reuse after deletion breaks old links (founder 7) |
| Existing trip rendering | Changes, accepted | PRD replaces v1; continuation pages for old long days; `jitter` keys unchanged. Seed must be carried (tech 2) |
| Template contract | Yes | `StoryFrame`/`CarouselFrames` required in the same release as both templates |
| Storage | Yes | Paths and variants unchanged; new avatar path is inside the user folder; migration 7 copied unchanged |
| Cache tags | Yes | URL-based `trip-url` kept, `trip-social` added; missing refreshes (tech 4, 12, 13, 22) |
| Env vars | Yes | Only additions; email skipped when unset |
| Analytics names | Changes, listed | Sheet wins, but the specs disagree with it (tech 5) |
| Deploy order | Stated | Make it robust to code-before-migration (tech 3e) |

### CTO decisions already taken: does any create a real problem?

| Decision | Verdict |
|---|---|
| C-A9 Vercel Hobby | **Yes, a likely terms-of-use problem** (tech 9). Re-check or move to Pro |
| C-B3 Resend free | Fits the friends test only with a daily budget that protects magic-link sign-in (tech 10) |
| C-A6 Haiku 5.5 captions | Fine; fix the cost table (note 27) and derive input on the server (tech 17) |
| C-A7 Nominatim | Fits a friends test **if** the limiter, cache, per-user limit, User-Agent with contact, no autocomplete and attribution are actually enforced (tech 8); plan the switch before a public launch |

### Verdict

**CHANGES NEEDED.** Before the CTO approves:

- The founder answers founder items 1 and 2, the two contradictions inside the PRD's own acceptance criteria. Items 3–7 are needed before Release 1b / Release 2 but don't block the backend start.
- The Tech Lead fixes tech items 1–7: foreign-key inventory, column carry-over in save functions, the `get_trip` contract, account-deletion cache refresh, alignment with the taxonomy, an in-app browser plan, and PostHog configuration. Items 8–26 should land in the same revision where cheap. Items 8, 9, 10 and 11 materially affect the friends test.

### Questions for the founder (one line each)

1. M3: accept "12 photos over 3 days → 4 pages in date order" (3 per page), or ask for 5-photo pages?
2. M10 / S3: accept "no number below 3 likes; M10 tested on a Quest with 3+ likes"?
3. Instagram in-app browser: show "Open in your browser to sign in" (and offer the email link first there)?
4. Rollout: accept no feature flag (C-A5), and add an invited-emails allowlist from day one?
5. Undated photos in a mixed trip: spec rule (fill the last page, then new pages) or PRD rule (join the nearest page in pick order)?
6. Feed: is "a same-day Quest with more likes sits above" meant strictly (sort within a day) or loosely (time-decayed score)?
7. A deleted account's usernames: never reusable (recommended) or released after N months?
8. F-A2 to F-A8, F-B2, F-B3, F-C1 to F-C6 as listed in the specs (all have recommendations); in particular, who updates the privacy policy before the test (F-C6)?

### Questions for the CTO (one line each)

1. Do Vercel's Hobby terms really cover a company's pre-revenue product with two team members, or do we move to Pro now?
2. Resend: accept a code-level daily cap on notification emails so magic-link sign-in never hits the 100/day limit?
3. Nominatim: where do the global 1 request/second limit and the cache live (database or Next data cache), and what is the contact address for the User-Agent?
4. Which plan does the Supabase preview project run on (a second Pro project's cost vs a free project's pausing and 1 GB storage)?
5. Accept that publish checks the live trip row's `saved_at` as well as the draft's (tech 11)?
6. Retention for archived comments and URL tombstones after account deletion (tech 26)?
7. C-A1 to C-A5, C-A8, C-A10, C-B1, C-B2, C-B4, C-B5, C-C1 to C-C6 as recommended in the specs: I found no problem with them beyond the items above.

### Tracker update (no Sheets access from this review; for a human to apply)

Pipeline row "OnQuest MVP": product changes needed → status `Blocked`, Owner `Founder`, Notes: "Plan review round 1: 9 blocking (2 founder, 7 technical). Founder questions 1–7 in docs/reviews/2026-11-10-plan-review-onquest-mvp.md". The Tech Lead revises the specs in parallel (technical items 1–7), then requests round 2.
