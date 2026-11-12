# Spec A: Data model and create flow (OnQuest MVP)

| | |
|---|---|
| PRD | `docs/prds/onquest-mvp.md` (approved by the founder on 2026-11-09; social layer re-approved the same evening) |
| Status | **Approved by the CTO on 10 Nov 2026** (plan review round 3: technical pass; all CTO decision items accepted as recommended). Founder items still open, F-A1 and F-B1 first. Revised for plan review round 3. Changes are listed in §17 and §18 |
| Build mode | Backend + Frontend split. Frontend starts on sample data once A-01 (contract) lands; backend lands the data model first |
| Tracker IDs | One row per task in `docs/specs/onquest-mvp-tasks.md` (A-01 … A-15) |
| Sibling specs | B: `docs/specs/onquest-mvp-b-quest-page.md` (viewing, likes, comments, notifications, export). C: `docs/specs/onquest-mvp-c-social.md` (shell, home, feed, explore, guides, profiles, follow, settings, manage Quest) |
| Review | `docs/reviews/2026-11-10-plan-review-onquest-mvp.md` (round 1), `docs/reviews/2026-11-10-plan-review-onquest-mvp-round-2.md` (round 2) |

**Why three specs.** The PRD is 28 Must stories and 20 screens: one spec would be unreviewable and would block every screen behind the slowest piece. The split follows data ownership, so each spec can be reviewed and shipped on its own:

- **A (this spec)** owns every write to a Quest and to a profile row: the move to decision 0001 (keys, archives, save functions), the create flow (pick → arrange → review → template → preview → publish → share), the manage actions behind the ⋯ menu, sign-in return paths (including in-app browsers), the geocoder, retention jobs, and the analytics plumbing every other screen uses. Everything else reads what A writes, so A's backend goes first.
- **B** owns how a Quest is seen and reacted to: the paged Quest player and both templates, the Quest page with likes and comments, notifications (bell and email), view counting and the Instagram export.
- **C** owns the signed-in app around Quests: bottom bar, welcome screens, Home and feed, Your Quests and the ⋯ menu UI, Explore, search, guides, profiles, follow, edit profile, settings and account deletion.

"Quest" is the product word; code and database keep `trip` (CLAUDE.md, `ScrapbookPage`, `TripData`), so no rename churn. App routes use `/quests/...` because users see them.

## 1. Summary

A creator picks 3 to 15 photos; the phone reads dates and rough locations, shrinks the photos (EXIF and GPS removed) and uploads them while OnQuest arranges them into up to 5 pages of up to 3 photos, names places and writes short captions. They can publish untouched or edit pages, pick Beach or Mountain, preview and publish as public, unlisted or private.

Technically: the schema moves to decision 0001 (one permanent `key`, archive tables, one Postgres save function per change, `saved_at` conflict check). A Quest becomes **one document** (content, photos and places in one row), with a separate **working draft** row so autosaves never touch the published Quest and edits go live only on Publish. Every foreign key is rebuilt so that a save, which deletes and re-inserts the live row, can never cascade into other data.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| M1: signed out on "Make your own Quest" → Google sign-in → lands on Pick photos | `safeNext()` + `/auth/callback?next=` + onboarding pass-through (A-06); in-app browsers get the "Open in your browser" step (A-15) | `lib/auth/next.test.ts`, `inAppBrowser.test.ts`; UX task 4 + Instagram-story check |
| M2: 16th photo refused with "A Quest holds 15 photos. Remove one to add another." | `PickPhotos` limit, `MAX_PHOTOS` (A-09); `save_trip_draft` rejects > 15 (A-03) | `PickPhotos.test.tsx`; `tests/db/tripSave.test.ts` |
| M2: Next disabled with "Pick at least 3 photos" until 3 | `PickPhotos` (A-09) | `PickPhotos.test.tsx` |
| M3: 12 dated photos over 3 days → 3 pages, one per day | `arrangePages()` (A-05). **Can't hold with 3 photos per page; founder decision F-A1** | `arrange.test.ts` |
| M3: 15 photos over 9 days → ≤ 5 pages titled with day range | `arrangePages()`, `pageTitle()` (A-05) | `arrange.test.ts` |
| M3: 7 undated photos → 3 pages (3, 3, 1), pick order, "Page 1"–"Page 3", no captions | `arrangePages()` (A-05) | `arrange.test.ts` |
| M4: Panjim photos → page title includes "Panjim", captions ≤ 60 chars | `nameLocations` + `writeCaptions`, `pageTitle()` (A-05) | `arrange.test.ts`, `captions.test.ts` (model mocked), `geo.test.ts` (Nominatim mocked) |
| M4: no location → no caption | `writeCaptions` reads only photos with a place from the stored draft (A-05) | `captions.test.ts` |
| M5: move to a page with space; swap on a full page with Undo; remove blocked at 3; replace keeps slot with Undo; set date keeps page and updates page dates | `pageEdits.ts` pure functions + editor store undo stack (A-11) | `pageEdits.test.ts`; UX task 3 |
| M6: switch Beach → Mountain keeps photos and words | Only `document.templateId` changes (A-12); Mountain template (B-04) | `pageEdits.test.ts`; UX task 3 |
| M7: preview = what a viewer sees, animated | Preview renders `draftToTripData()` through the same `TripPage` (A-12, B-02) | `toTripData.test.ts` draft path; UX task 1 |
| M8: unlisted → plays for signed-out friend, not on profile or search | `publish_trip` visibility; `get_trip`, `get_profile` and search filters (A-03, C-04) | `tests/db/tripSave.test.ts`, `tests/db/access.test.ts` |
| M8: private → "This Quest is private." | `get_trip_status()` (B-01) and Quest page state (B-07) | `tests/db/questStatus.test.ts` |
| M14 (survives re-publish): comments stay off after Publish | `publish_trip` carries `comments_on` from the live row (§3.10) | `tripSave.test.ts` "comments_on unchanged after publish" |
| M16 (edit part): edit after publishing | Draft row kept after publish; Publish copies it (A-03, A-04) | `tests/db/tripSave.test.ts`; UX task 3 |
| M16 (delete part), M28 (backend) | `deleteQuest`, `setQuestVisibility`, `setQuestComments` (A-04); UI in C-07 | `tests/db/tripDelete.test.ts` |
| UX task 3 "nothing else moved" | `seed` carried by every save, never defaulted (§3.10) | `tripSave.test.ts` "seed unchanged after publish, visibility, comments" |
| Edge: leaving mid-creation keeps a Draft | Draft row created on Next (§3.2); before Next the picks wait in IndexedDB and are offered again; autosave after (A-04, A-13) | Playwright smoke (B-11) |
| Edge: offline mid-upload, nothing lost; 3 failures → Retry and Remove | Upload queue pause/resume + IndexedDB pending store (A-10) | `uploadQueue.test.ts` |
| Edge: HEIC and very large photos accepted | `image.worker.ts` + lazy HEIC fallback (A-10) | Manual on iPhone + Android (UX task 1) |
| Product requirement: arranged draft ≤ 60 s after last upload (15 photos, 4G) | Arranging runs on metadata read at pick time, in parallel with upload (§3.2) | `quest_arranged.duration_ms` in PostHog; UX task 1 |

## 3. Approach

### 3.1 Data model under decision 0001

This spec answers the four open questions in `docs/decisions/0001-no-in-place-updates.md`:

| Question | Answer | Why |
|---|---|---|
| Where archived rows live | Separate `<table>_archive` per table: the live table's columns plus `archived_at`. **Primary key `(key, saved_at)`; no other unique constraints and no foreign keys** (an archive holds many rows per key, and must not block deletes) | Live tables keep one row per key; unique constraints and RLS stay plain |
| How big a document is | **A trip is one document**: `content`, `photos` (jsonb array) and `places` (jsonb array) live on the trip row. The legacy `photos` and `places` tables stop being written, keep their rows frozen as a rollback copy, and are dropped in a later contract migration | With 15 photos, archiving one row per save is cheap; archiving 15 photo rows + places on every caption edit is not |
| Drafts | A separate **`trip_drafts`** table, one row per trip key, holds the working copy. Autosave archives only drafts. `trips` holds the published document; only publish, visibility, comments and delete touch it | Edits go live on Publish (UX task 3). `trips_archive` stays a readable history of what the public saw |
| Retention | **Decided 10 Nov (CTO): weekly cleanup with `pg_cron`.** Proposed ages (CTO to confirm, C-A12): archived likes, comments and follows 90 days; archived trips, drafts, profiles and notification reads 180 days; notifications 365 days; geocoder call log 1 day; email send log 7 days; URL tombstones and handle claims never (usernames are never reused). **Decision 0001 amendment needed (human edit):** 0001 rule 7 allows real deletes only for a user's trip or account deletion, and its open question keeps archived published rows until the trip is deleted; the weekly job's deletes of archived rows need a written amendment (or a decision 0003) before A-03 ships it (C-A16). Agents don't edit decision files | Bounded history; DPDP-friendly; numbers in one function |

Records and keys (every table has `saved_at`, `saved_by`, `save_reason`, per 0001 rule 6):

| Table | Key | Changes | Archive? |
|---|---|---|---|
| `profiles` | `key` = auth user id | `save_profile`, `save_profile_settings` (C), `save_profile_settings_as_admin` (B) | `profiles_archive` |
| `trips` | `key` (uuid, made in the browser at first pick, §3.2) | `create_trip`, `publish_trip`, `set_trip_visibility`, `set_trip_comments`, `delete_trip` | `trips_archive` |
| `trip_drafts` | same `key` as its trip | `create_trip`, `save_trip_draft` | `trip_drafts_archive` |
| `handle_claims` | `handle` | Insert-only: every handle a profile has ever had. **Kept forever, even after account deletion: usernames are unique and never reused** (CTO, 10 Nov), so old shared links can't be taken over | none (rows never change) |
| `removed_trip_urls` | `url_hash` | Insert-only tombstone: `url_hash = sha256(lower(handle) || '/' || slug)`, plus `trip_key` (for the `quest_unavailable` event), so a deleted Quest's link says "This Quest was removed." Kept forever | none |
| `geocode_cache` | `cache_key` | Insert-only, cached forever (OSM data under ODbL), §3.4 | none |
| `geocoder_calls` | `key` | Insert-only call log for the 1/s limiter and per-user limits, purged after 1 day | none |
| Photos | `photos[].id` is the photo's permanent key (also its storage folder, which never changes) | Part of the trip document | with the document |

### 3.2 Create flow, end to end

```
Create a Quest ──(signed out?)──> /login?next=/quests/new&intent=make_your_own|… ──> back
/quests/new  Pick photos (3–15)
   ├─ on first pick: the browser makes the Quest key (crypto.randomUUID()); uploads go to {userId}/{key}/
   ├─ per photo, in the image worker: read EXIF (date, GPS) → re-encode thumb/display/export (no EXIF)
   ├─ upload queue: thumb + display first, export.jpg last; 3 in parallel; retries; offline pause
   ├─ picks and processed files wait in IndexedDB until Next, so leaving and coming back loses nothing
   └─ GPS stays in browser memory only
Next ─> createQuest({ key, source })  → draft row exists (quest_draft_created, per the taxonomy)
     ─> /quests/[key]/arrange  ("Sorting by day…" → "Finding places…" → "Writing captions…")
   ├─ arrangePages(): pages from dates (pure, instant)
   ├─ nameLocations({ key, points }): ≤ 5 clusters, cache first, then Nominatim one at a time, 5 s budget
   ├─ saveQuestDraft() with photos, pages and places
   ├─ writeCaptions({ key }): the server reads date + town for each eligible photo from the draft; 8 s cap
   └─ reportCreateProgress({ key, arranged }) → review. Any failure → pick order, 3 per page, fallback message
/quests/[key]/review  ─ edits autosave (1.5 s debounce), Undo for move/swap/remove/replace/add
/quests/[key]/template ─ Beach | Mountain, each previewed with the creator's cover
/quests/[key]/preview  ─ real TripPage from the draft; "Back to edit" | "Publish" (sheet)
publishQuest() ─> /quests/[key]/share  "Your Quest is live!" Copy link · Share to WhatsApp · Download for Instagram (B)
```

The draft row is created on **Next**, not on the first pick, so `quest_draft_created` fires where the taxonomy says it does and "Creation completion" (published ÷ drafts) has the PRD's denominator. The key exists from the first pick so uploads can start at once; files picked and then abandoned before Next stay in the user's own folder (a few MB at most, removed with the account). Coming back to "Create a Quest" with picks waiting in IndexedDB offers them again ("Pick up where you left off?").

Arranging needs only the photo metadata read at pick time, not finished uploads: grouping is instant, place names take at most the 5 s geocoding budget (usually < 1 s from the cache), captions one model call (2–4 s, capped at 8 s). The upload of 15 photos (~15 MB with `export.jpg`) is the long pole; `export.jpg` goes last so the draft and preview don't wait for it.

### 3.3 Arranging rules (`features/editor/arrange.ts`, pure)

Constants in `lib/trip/limits.ts`: `MAX_PHOTOS = 15`, `MIN_PHOTOS_TO_PUBLISH = 3`, `MAX_PAGES = 5`, `PHOTOS_PER_PAGE = 3`, `CAPTION_MAX = 60`.

1. Photo day = `tripDateKey(takenAt)` (kept from the WIP: local date of taken time minus 4 h, so 1 a.m. photos belong to the night before). Dated photos sort by `takenAt`; undated keep pick order.
2. **All dated photos on one day and more than 3:** pages of 3 in time order. Titles "Morning" (before 12:00), "Afternoon" (12:00–16:59), "Evening" (17:00+) by the page's first photo, used only when every page gets a different label; otherwise "Page N".
3. **Otherwise:** one or more pages per day, 3 photos each, never mixing days. If that plus `ceil(undated / 3)` pages is more than 5, fall back to pages of 3 in date order (pages may span days).
4. **Undated photos:** fill the last page's free slots, then new pages of 3, in pick order. 15 photos never need more than 5 pages. (The PRD's edge-case table says "join the nearest page in pick order"; the two rules give different Quests, founder decision F-A10.)
5. **Titles** (`pageTitle()`, also run after every edit for pages whose `titleSource` is `auto`): one day → "Day N · Place"; several days → "Days A–B · Place" (N counted from the first trip day; Place = the most common place name on the page, omitted when none); no dates → "Page N". Page `startDate`/`endDate` = min/max photo `date` on the page.
6. **Quest title** default (`defaultQuestTitle()`): place + days → "4 days in Goa" / "A day in Panjim"; place only → "Panjim"; dates only → "October 2026"; nothing → the template's default title.
7. **Captions:** only photos with a place name get one; `captionSource: 'auto'`.

Rules 2–4 are the prototype's `arrange()`. They can't satisfy the PRD's "12 photos over 3 days → 3 pages" check: founder decision F-A1. The rule lives in one function so A-05 can proceed and swap it when the founder answers.

### 3.4 Places, GPS and the geocoder (Nominatim)

**Decided 10 Nov (CTO): OpenStreetMap Nominatim.** The design below makes its usage policy hold across every Vercel serverless instance, using Postgres (we already have Supabase Pro):

- **GPS never leaves the phone exactly.** `exifr` reads GPS in the worker; it is clustered in the page with `suggestPlaces()` (kept from the WIP, ≤ 1 km clusters, at most 5, largest first), rounded to 2 decimals (~1 km) **before** it is sent to `nameLocations`. It is never uploaded, stored, logged or sent to analytics. The re-encoded files contain no EXIF.
- **Town level only.** Reverse lookups use `zoom=10` (city/town), `addressdetails=1`, `accept-language=en`, `format=jsonv2`. Name = `address.city ?? town ?? village ?? county`; point = the returned place's centre, not the photo's location (founder confirmation F-A5). Search (`searchPlaces`) uses `q`, `featureType=settlement`, `limit=5`, `accept-language=en`.
- **Cache (`geocode_cache`).** Key `rev:10:{lat2}:{lng2}` (rounded) or `search:en:{normalised query}`; value = the result, or "no result" **only when Nominatim answered 200 with an empty list**; timeouts, 429s and 5xx answers are never cached, so a town can be named on a later try. Cached forever. Insert-only (`on conflict do nothing`), so it fits 0001 (rows never change). RLS on with no policies; read and written only by `lib/geo.ts` through two `service_role`-only functions (`geocode_cache_get(keys text[])`, `geocode_cache_put(key, result)`), so users can't poison it.
- **Global limiter: 1 request a second across all instances.** `claim_geocoder_slot(p_user_key, p_kind) → integer` (service role only) takes `pg_advisory_xact_lock` for the duration of one short transaction, reads the latest `geocoder_calls.called_at`, and either inserts a new call row and returns `0` (go now) or returns the milliseconds to wait. The caller waits **outside** any transaction (no connection held, no `pg_sleep`) and asks again. This is an insert-only log rather than the single-row counter the CTO suggested, because a single row would need an `UPDATE`; it holds the limit the same way and fits 0001. The log is purged after 1 day by the weekly job.
- **Sequential, inside a 5 s budget.** `nameLocations` looks up all points in the cache first, then calls Nominatim one point at a time through the limiter. Points not answered within 5 s get no place name (the Quest still arranges; `quest_arranged.fallback_used` reflects missing dates only). This replaces "≤ 5 parallel calls", which contradicted the 1/s policy.
- **Ownership and per-user limits.** `nameLocations({ key, points })` checks the caller owns draft `key` (RLS select). `claim_geocoder_slot` also refuses (returns `-1`) when the user already made 10 reverse lookups or 20 searches in the last 10 minutes; cache hits don't count. Refused → no place name, no error to the user.
- **Search is submit-only** (no autocomplete, as the WIP `PlaceSearch.tsx` already does): the user types a town and taps Search.
- **Identification.** Every request sends `User-Agent: OnQuest/1.0 (+https://onquest.in; ${GEOCODER_CONTACT_EMAIL})`. New env var `GEOCODER_CONTACT_EMAIL` (server only; the CTO supplies the value). When it is unset, `lib/geo.ts` makes no Nominatim calls (cache only), so a misconfigured preview can't break the policy.
- **Attribution.** "© OpenStreetMap contributors" wherever stored place names appear on a map (route page, profile map) and under place search results.
- **Later.** Before a public launch, switch to the Geoapify fallback or a paid provider behind the same `lib/geo.ts`. The WIP's `lib/geo.ts` is Mapbox code, so it is a **rewrite**, keeping only the `GeoPlace` shape.

### 3.5 Captions model

**Decided 10 Nov (CTO, C-A6): Claude Haiku 5.5** through the Anthropic API, called from the `writeCaptions` server action. **The input is only `{ key }`**: the server reads the stored draft (owner check through RLS) and builds the prompt from each eligible photo's date and town name, so no client-sent text ever reaches the model. One request per Quest (≤ 15 items), JSON output `{ photoId, caption }[]`, each trimmed to 60 characters server-side and stored as plain text (React escapes it). The action then saves the captions into the draft (`captionSource: 'auto'`) through `save_trip_draft` and returns them with the new `savedAt`.

| | Haiku 5.5 (chosen) | Small OpenAI / Gemini models | No model (templates like "Sunset in Panjim") |
|---|---|---|---|
| Cost per Quest (≈ 1,500 tokens in, 600 out) | ≈ $0.0005 at $0.10 / $0.50 per million | Similar order (not re-checked) | $0 |
| Added time | 2–4 s, capped at 8 s | 1–3 s | 0 |
| Quality | Short copy, reliable JSON and length | Comparable | Repetitive |
| New vendor | Yes (Anthropic) | Yes | No |

Timeout or error → no captions (the Quest still looks finished). `writeCaptions` refuses when the draft already has auto captions for every eligible photo, which bounds repeat calls. New env var `ANTHROPIC_API_KEY` (server only, Production + Preview). Anthropic is added to the privacy policy's processor list.

### 3.6 Publish, URLs and visibility

- Slug is made from the title at **first publish** (`slugify`, ≤ 80 chars, `-2`, `-3` on clash) and **never changes after**, so shared links never break. The clash check covers the owner's live Quests **and** tombstoned URLs under any of their handles, so a deleted Quest's link never starts opening a newer Quest.
- First published as **unlisted** → the slug gets the existing 6-character random suffix (`unlistedSlug()`), as in `docs/03` §A.1.
- **Changing visibility never changes the URL** (PRD M28: "its link still works"; founder confirmation F-A4).
- **Publish sheet default:** on a **first** publish, the creator's "New Quests start as" setting (C), Public unless changed (PRD screen 8). On a **re-publish**, the Quest's **current** visibility, so re-publishing a private Quest never makes it public by surprise.
- **Two conflict checks on publish (decided 10 Nov, CTO).** `publish_trip` checks the draft's `saved_at` **and** the live trip row's `saved_at`. A stale tab or second device can't overwrite a newer published version (for example make a just-made-private Quest public again). On conflict the UI says "This Quest changed on another device. Refresh to see the latest."
- Private Quests keep their URL; a visitor sees "This Quest is private." (B).
- Handle changes (C) keep old links working through `handle_claims`.

### 3.7 Editing after publish, and removed photos

- The draft row stays after publish. "Edit Quest" opens it; changes autosave to the draft only; "Publish" copies the draft to `trips` (archiving the previous published row). Leaving without publishing keeps the changes in the draft (founder confirmation F-A3). `trips.published_draft_saved_at` records which draft version was published (it tells "has unpublished changes" later, and is how the publish conflict check knows the draft it was based on).
- A photo removed or replaced in the editor keeps its files until the **next publish** or the Quest's deletion, because Undo and the draft still need them. After a successful publish, inside `after()`, `publishQuest` lists the trip's storage folder and deletes files of photo ids that are in neither the new published document nor the current draft, **skipping any object created in the last hour** (an upload still waiting for its autosave). Trade-off, accepted: archived rows (`trips_archive`, `trip_drafts_archive`) may then reference deleted files; restoring such a row shows those photos missing (toTripData drops them, no empty boxes). Until the sweep, a removed photo is reachable only by its exact URL (the `docs/03` §A.2 trade-off). CTO decision C-A4.
- Old test trips with more than 15 photos still render. Opening one in the editor shows "This Quest has N photos. Choose 15 to keep editing." (frontend), because `save_trip_draft` rejects more than 15.

### 3.8 Sign-in return paths, and in-app browsers

- `/login?next=<path>&intent=<like|comment|make_your_own>&ref=<tripKey>` → Google → `/auth/callback?next=...` → if no profile, `/onboarding?next=...` (pick username) → `next`. `safeNext()` accepts only same-origin relative paths starting with `/` (not `//`), else `/home`. The welcome screens (C) are skipped when there is a `next` (founder confirmation F-A2). The sign-in title switches by `intent` (screen 1 copy). `sign_in_started.source` = the intent, or `app_open` when there is none.
- Supabase Auth redirect URLs must allow `https://onquest.in/auth/callback**`, `https://onquest.in/auth/confirm**` and the same for the preview domain pattern; A-06 adds this to `docs/runbooks/auth.md`.
- **Two sign-in landings.** Google keeps `app/auth/callback/route.ts` (PKCE `exchangeCodeForSession(code)`; it works because Google sign-in starts and ends in the same browser). **Email links use a new `app/auth/confirm/route.ts`**, because a PKCE magic link only works in the browser that asked for it, and a link requested inside Instagram is opened in Safari or Chrome from the mail app:
  - `signInWithEmail` calls `signInWithOtp({ email, options: { emailRedirectTo: origin + '/auth/confirm?next=' + encodeURIComponent(safeNext(next)) + '&intent=…&ref=…' } })`.
  - The Supabase **Magic Link** and **Confirm signup** email templates (Dashboard → Auth → Email templates, text kept in `docs/runbooks/auth.md` and applied to prod and preview) link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`, not `{{ .ConfirmationURL }}`.
  - `/auth/confirm` (GET) reads `token_hash` and `type`, calls `supabase.auth.verifyOtp({ type: 'email', token_hash })` on the server client (which sets the session cookies in **this** browser, whichever it is), then follows the same path as the callback: unfinished account deletion → finish and sign out (C §3.9); no profile → `/onboarding?next=…`; else `safeNext(next)`. Invalid or expired token → `/login?error=link` ("That link has expired. Send a new one.").
  - Links expire after the Supabase default (1 hour) and work once. Some mail scanners open links before the person does; if friends-test reports show "expired" on first tap, the route becomes a page with a "Continue" button that verifies on POST (Later).
  - `lib/auth/confirm.test.ts` covers: valid token in a browser with no prior cookies signs in and lands on `next`; unsafe `next` → `/home`; bad token → the error page; no `exchangeCodeForSession` call on this route.
- **In-app browsers (Instagram, Facebook, Messenger, Snapchat, TikTok, LinkedIn, Line, generic Android WebView).** Google refuses OAuth inside embedded browsers (`disallowed_useragent`), and links from an Instagram story (where M17's exports point) open in one. `lib/auth/inAppBrowser.ts` detects them from the user agent (`Instagram`, `FBAN|FBAV|FB_IAB`, `Snapchat`, `musical_ly|BytedanceWebview|TikTok`, `LinkedInApp`, ` Line/`, `; wv\)`). WhatsApp opens links in the system browser or a Custom Tab, where Google works, so it is not on the list. On `/login`, and before any like/comment/"Make your own" sign-in redirect, an in-app browser gets the **"Open in your browser"** screen instead of the Google button:
  - Android: a primary button that reopens the same URL (with `next`, `intent`, `ref`) in Chrome through an `intent://…#Intent;scheme=https;package=com.android.chrome;end` link.
  - iOS (no way to open Safari from the page): short steps with a picture ("Tap ⋯ then Open in browser"), plus **Copy link** (the same URL with `next`, `intent`, `ref`).
  - Once Resend is the Auth SMTP (F-A8), **"Email me a sign-in link"** is offered here as well: the emailed link opens in the phone's normal browser, and `/auth/confirm` signs in there and carries `next`, `intent` and `ref` (above).
  - Copy and order are a founder decision (F-A9); the recommendation is in §14.
  - The taxonomy has no event for this screen yet; A-15 adds none until the sheet does (listed as a sheet change request, §10).

### 3.9 Analytics and error reporting

**Names, properties and allowed values come from `docs/analytics/*.csv`** (the Taxonomy sheet export; the CSVs win over the PRD table, the prototype and this spec). A-07 turns them into zod schemas in `lib/analytics/events.ts`; a test fails if code sends an event, a property or a value not in the CSVs. Any change starts in the sheet and is re-exported in the same PR.

**PostHog client config** (`lib/analytics/client.ts`, part of the contract):

```ts
posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: '/ingest',                 // first-party proxy: a route handler, see below
  persistence: 'localStorage',         // no cookies
  bootstrap: { distinctID: anonId },   // anon_<uuid> from localStorage 'oq_anon_id'
  autocapture: false,                  // no click capture, so no element text ever
  capture_pageview: false,             // we send $pageview ourselves, with templates (below)
  capture_pageleave: false,
  disable_session_recording: true,     // no session replay
  disable_surveys: true,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_exceptions: false,          // errors go to Sentry, scrubbed
  capture_performance: false,         // no web-vitals events
  advanced_disable_feature_flags: true,
  mask_all_text: true,                 // belt and braces if anything is turned on later
  mask_all_element_attributes: true,
  before_send: allowlistProperties,    // see below
});
```

- **The `/ingest` proxy is a route handler, not a rewrite** (`app/ingest/[...path]/route.ts`, GET and POST). A `next.config.ts` rewrite would pass on the browser's `Referer` (the full page URL, e.g. an unlisted slug) and our Supabase cookies. The handler forwards to `https://{POSTHOG_HOST}/{path}` with only the request body and the headers `content-type`, `content-encoding`, `user-agent` (PostHog derives browser and OS from it) and the client IP (`x-forwarded-for`, first address, for GeoIP), and drops every other header, including `referer`, `cookie` and `authorization`. Responses are passed back without `set-cookie`. posthog-js is bundled from npm, so no script is loaded through the proxy. `ingestProxy.test.ts` asserts that `referer`, `cookie` and `authorization` never reach the upstream request.
- **Pageviews with path templates only.** On each route change `trackPageview(template)` sends `$pageview` with `$current_url = https://onquest.in{template}` and `$pathname = template`, where `template` is the route pattern (`/@[handle]/[slug]`, `/quests/[key]/review`, `/guides/[slug]`, `/home`), never a real handle, slug or key.
- **`before_send` allowlist.** Each event keeps only: its own properties from the CSVs, the common properties (`event_id`, `session_id`, `anon_id`, `platform`, `app_version`, `screen`), and PostHog's technical fields (`$lib`, `$lib_version`, `$os`, `$browser`, `$device_type`, `$screen_width`, `$screen_height`, `$insert_id`, `$time`). Everything else is removed, including `$current_url`, `$pathname`, `$host`, `$referrer`, `$referring_domain`, every `$initial_*`, UTM fields, `$set`/`$set_once` (except on `$pageview`, where `$current_url`/`$pathname` are the templates above). `screen` is a fixed screen name (`quest_page`, `review`, …).
- **Identify** with the user key only (`posthog.identify(userKey)`), never name, handle or email as person properties.
- **Country** is resolved from the IP at ingest and the IP is not stored: turn on "Discard client IP data" in the PostHog project, keep GeoIP. Server events set `country` from the request's `x-vercel-ip-country` header and send `disableGeoip: true`.
- **Server events:** `posthog-node` from `lib/analytics/server.ts` (`import 'server-only'`), `type: 'server'`, `server_ts`, distinct id = the user key, sent inside `after()` so they never slow or fail an action. Same allowlist.
- **Never** in any property: user text (titles, captions, comments, search text), names, handles, emails, photo URLs, Quest URLs or slugs, coordinates. Quests are identified by `quest_id` = key.
- **Sentry:** `sendDefaultPii: false`; `beforeSend` and `beforeBreadcrumb` scrub request bodies, query strings, cookies, server-action arguments and any string over 40 characters; breadcrumbs for console and fetch bodies are off. Error names and stack frames only.
- Persistent `anon_id` replaces PostHog's "cookieless" mode in `docs/03` §B.4 (C-A8); the privacy notice at sign-up must say so (F-C6).

### 3.10 Save functions: what carries over

Every save function follows one rule: **copy every column of the current live row, override only the named fields, and insert with an explicit column list.** No insert inside a save function relies on a column default. Migration 9 drops the defaults on `trips.seed`, `trips.visibility`, `trips.status` and `trips.comments_on` after the backfill, so an insert that forgets one fails loudly instead of reshuffling `jitter` or turning comments back on.

| Function | Carried from the live row (unchanged) | From the draft | From the caller | Computed |
|---|---|---|---|---|
| `create_trip` (new row) | — | — | `key`, `template_id` | `owner_key = auth.uid()`, `slug = 'trip-' + 6 random chars`, `status = 'draft'`, `visibility` = owner's `defaultVisibility`, `comments_on = true`, `seed = floor(random() * 2147483647)`, empty document, `word_count = 0`, `search_text = ''`, `published_at = null`, `published_draft_saved_at = null`. Also inserts the `trip_drafts` row with the same key and the empty document |
| `save_trip_draft` (`trip_drafts`) | `key`, `owner_key` | — | the document fields: `template_id`, `title`, `short_title`, `start_date`, `end_date`, `cover_photo_key`, `content`, `photos`, `places`, `started_at` | `saved_at`, `saved_by`, `save_reason = 'save'` |
| `publish_trip` (`trips`) | `key`, `owner_key`, `seed`, `comments_on`, `published_at` (if set), `slug` (if already published) | `template_id`, `short_title`, `start_date`, `end_date`, `cover_photo_key`, `content`, `photos`, `places`, `started_at` | `title`, `visibility`, `word_count`, and `slug` (first publish only) | `status = 'published'`, `published_at = now()` on first publish, `search_text` (title + destination + place names), `published_draft_saved_at = draft.saved_at` |
| `set_trip_visibility` | every column except `visibility` | — | `visibility` | metadata |
| `set_trip_comments` | every column except `comments_on` | — | `comments_on` | metadata |
| `save_profile` | `key`, `created_at`, `settings` | — | `handle`, `name`, `bio`, `home_city`, `avatar_url` (built on the server from a photo id, C) | metadata; a new handle also inserts a `handle_claims` row |
| `save_profile_settings` (C) / `..._as_admin` (B) | every column except `settings` | — | `settings` (whole object / one switch) | metadata |

**Concurrency.** Each write function locks the live row (`select … for update`), compares `saved_at::text` with `p_based_on` and raises `OQ409` on a mismatch. With delete-and-insert, a second concurrent save waits on the lock and then finds no row (its row was deleted by the first); in that case the function re-reads by key, and if a row exists it raises `OQ409` (conflict), not `not_found`. A db test runs two saves on the same `saved_at` and expects one success and one conflict.

## 4. Contract

### 4.1 Data shapes

`lib/trip/limits.ts` (new):

```ts
export const MAX_PHOTOS = 15;
export const MIN_PHOTOS_TO_PUBLISH = 3;
export const MAX_PAGES = 5;
export const PHOTOS_PER_PAGE = 3;
export const CAPTION_MAX = 60; // editor and model limit; stored limit stays 80 (never narrowed)
```

`lib/trip/schema.ts` (changes; nothing narrowed, nothing made required):

```ts
// A "page" in the product is a Day in stored content. Existing fields and limits unchanged.
export const DaySchema = z.object({
  id: z.uuid(),
  title: z.string().trim().max(40).optional(),
  titleSource: z.enum(['auto', 'user']).optional(), // missing → 'user' if title set (old rows)
  startDate: z.iso.date().optional(),               // page date range shown on the Quest
  endDate: z.iso.date().optional(),
  quote: z.string().trim().max(60).optional(),
  story: z.string().trim().max(500).optional(),
  placeIds: z.array(z.uuid()).max(6),
  photoIds: z.array(z.uuid()).max(40),
});
// TripContentSchema unchanged.

export const TripPhotoSchema = z.object({
  id: z.uuid(),                                     // permanent key; storage folder name
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().trim().max(80).optional(),
  captionSource: z.enum(['auto', 'user']).optional(),
  takenAt: z.iso.datetime({ offset: true }).optional(), // owner-only, never returned publicly
  date: z.iso.date().optional(),                        // owner-only; EXIF day or set by hand
  placeId: z.uuid().optional(),
});

export const TripPlaceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60),
  lat: z.number().min(-90).max(90),   // the town's centre from the geocoder, never photo GPS
  lng: z.number().min(-180).max(180),
  geoRef: z.string().max(200).optional(),   // Nominatim osm_type + osm_id, e.g. "R1234"
  city: z.string().max(100).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  note: z.string().trim().max(300).optional(),
  photoId: z.uuid().optional(),             // kept from v1 places.photo_id (backfilled); new Quests: first photo at that place
});

/** The editable document, as stored in trip_drafts and copied to trips on publish. */
export const QuestDocumentSchema = z.object({
  templateId: z.string(),
  title: z.string().trim().max(60).optional(),
  shortTitle: z.string().trim().max(30).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  coverPhotoId: z.uuid().optional(),
  startedAt: z.iso.datetime({ offset: true }).optional(), // first photo picked (for minutes_since_start); owner-only
  content: TripContentSchema,
  photos: z.array(TripPhotoSchema).max(80), // stored limit (old trips); 15 enforced on save
  places: z.array(TripPlaceSchema).max(60),
});
```

**`get_trip` output schema (`TripRowsSchema`).** Every field returned today stays, with the same name and type. The fields added by migration 9 are **optional** in zod until the contract migration, so code deployed before or after migration 9 parses either output:

```ts
trip: z.object({
  id: z.uuid(),                       // = key (alias kept for compatibility)
  key: z.uuid().optional(),           // new; toTripData uses key ?? id
  slug: z.string(),
  template_id: z.string(),
  visibility: VisibilitySchema,
  status: z.literal('published').optional(),  // returned today (always 'published'); kept
  title: z.string().nullable(),
  short_title: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  cover_photo_id: z.uuid().nullable(),        // = cover_photo_key
  seed: z.number(),
  content: TripContentSchema,
  word_count: z.number().optional(),          // returned today; kept (metadata's index rule uses it)
  published_at: z.string().nullable(),
  updated_at: z.string(),                     // = saved_at (alias)
  saved_at: z.string().optional(),            // new
  comments_on: z.boolean().optional(),        // new; toTripData/B default true
}),
owner:  { handle, name: nullable, avatar_url: nullable }        // unchanged
photo_folder: string                                            // unchanged
photos: [{ id, width, height, caption: nullable }]              // unchanged
places: [{ id, name, lat, lng, note: nullable, photo_id: nullable }] // unchanged, photo_id kept
```

`lib/trip/types.ts`: `Day` gains `dateLabel?: string` (from `startDate`/`endDate` via `formatDateRange`). `TripData` gains `key: string` (`id` stays, same value, for existing templates). `toTripData()` applies: `key ?? id`, `titleSource` default, `dateLabel`, and nothing else new. It gains `draftToTripData(draft, owner, seed, defaults)` for the preview, built on the same code path so preview = viewer (M7).

`lib/trip/cards.ts` (new, used by A, B and C):

```ts
export const QuestCardSchema = z.object({
  key: z.uuid(),
  title: z.string(),
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  path: z.string().optional(),          // "/@riya/goa-trip", published only
  coverThumb: z.string().optional(),    // photoUrls(...).thumb
  pageCount: z.number().int(),
  photoCount: z.number().int(),
  places: z.array(z.string()).max(3),   // place names, for feed/cards
  likeCount: z.number().int().default(0),    // filled by B/C
  commentCount: z.number().int().default(0), // filled by B/C
  publishedAt: z.string().optional(),
  savedAt: z.string(),                  // trips row saved_at: the ⋯ menu's conflict token
  draftSavedAt: z.string().optional(),  // own cards only: the draft's saved_at
  owner: z.object({ key: z.uuid(), handle: z.string(), name: z.string(), avatarUrl: z.string().optional() }),
});
export type QuestCard = z.infer<typeof QuestCardSchema>;
```

`lib/profile/schema.ts` (new; first used by A-02):

```ts
export const ProfileSettingsSchema = z.object({
  emailOnLike: z.boolean().default(true),
  emailOnComment: z.boolean().default(true),
  emailOnFollow: z.boolean().default(true),
  defaultVisibility: VisibilitySchema.default('public'),
  showPlaces: z.boolean().default(true),
});
```

`lib/analytics/sources.ts` (new, from the CSVs): `QuestCreateSource = z.enum(['home_banner','home_empty','create_menu','quests_tab','quests_empty','make_your_own','ftue','whatis_sheet'])`.

**`savedAt` is an opaque string.** Postgres timestamps have microseconds; JavaScript `Date` keeps milliseconds. Save functions return `saved_at::text` and compare text; code never parses it with `Date`.

### 4.2 Server actions

All built with `action()`; domain errors are returned in `data` (the `setHandle` pattern), never thrown. `conflict` → the UI says "This Quest changed on another device. Refresh to see the latest." with a Refresh button.

`features/editor/actions.ts`:

| Action | Input (zod) | Result data | Errors (in data) | Cache tags refreshed |
|---|---|---|---|---|
| `createQuest` | `{ key: uuid, source: QuestCreateSource, startedAt: iso datetime }` | `{ savedAt, photoFolder }` | `exists` (key already used) | none (draft) |
| `saveQuestDraft` | `{ key: uuid, basedOn: string, document: QuestDocumentSchema }` refined: photos ≤ `MAX_PHOTOS`, days ≤ `MAX_PAGES`, ≤ `PHOTOS_PER_PAGE` photo ids per day, every day photo id and place id exists in the document, no photo on two days | `{ saved: true, savedAt }` | `conflict`, `not_found`, `too_many_photos` | none (draft only) |
| `nameLocations` | `{ key: uuid, points: z.array({ lat, lng }).max(5) }`, each rounded to 2 decimals by the schema (`transform`) | `{ places: (GeoPlace \| null)[] }` | `not_found` (not the owner) | — |
| `searchPlaces` | `{ key: uuid, text: 2–100 chars }` (submit only) | `{ places: GeoPlace[] }` (≤ 5) | `not_found`, `limited` | — |
| `writeCaptions` | `{ key: uuid, basedOn: string }` | `{ captions: { photoId, caption }[], savedAt }` (`[]` and the same `savedAt` on timeout or error) | `conflict`, `not_found` | — |
| `reportCreateProgress` | `{ key: uuid, uploaded?: { count 1–15, failed 0–15, heic 0–15, bytesTotal }, arranged?: { pages 1–5, photos 3–15, captionsWritten 0–15, fallbackUsed, failed, durationMs } }` | `null` | `not_found` | — (sends `photos_uploaded` / `quest_arranged` server events) |

`features/editor/publishActions.ts`:

| Action | Input | Result data | Errors | Cache tags |
|---|---|---|---|---|
| `publishQuest` | `{ key, basedOnDraft, basedOnTrip, visibility, title: 1–60 }` | `{ published: true, savedAt, path, url, firstPublish }` | `conflict`, `too_few_photos` (< 3), `too_many_photos`, `not_found` | `trip-url:{handle}/{slug}`, `trip-social:{key}`, `profile:{ownerKey}`, `explore`, `guide-quests` |
| `setQuestVisibility` | `{ key, basedOn (trip savedAt), visibility }` | `{ saved: true, savedAt }` | `conflict`, `not_found` | `trip-url`, `profile`, `explore`, `guide-quests` |
| `setQuestComments` | `{ key, basedOn, on: boolean }` | `{ saved: true, savedAt }` | `conflict`, `not_found` | `trip-social:{key}` |
| `deleteQuest` | `{ key }` | `{ deleted: true }` | `not_found` | `trip-url` (every claimed handle × slug), `trip-social`, `profile`, `explore`, `guide-quests` |

`publishQuest` computes `wordCount` with `countWords(toTripData(...))` (kept from the WIP) and passes it to `publish_trip`, then sweeps removed photo files (§3.7) inside `after()`. It sends `quest_published` on a first publish and `quest_updated` on a re-publish. `deleteQuest` deletes storage first (both buckets, the whole `{userId}/{tripKey}/` folder), then `delete_trip` (so a failure leaves a retryable Quest, never orphaned rows).

`features/account/actions.ts`: `setHandle` keeps its input and result but calls `save_profile` (creates the profile and its first `handle_claims` row) instead of `.upsert()`. Its reserved list gains the new top-level routes: `home, explore, quests, notifications, welcome, guides, email, ingest, people, api`.

Loaders (server, owner only, through RLS): `features/editor/getQuestDraft.ts` → `{ key, draftSavedAt, tripSavedAt, status, visibility, slug?, seed, ownerHandle, photoFolder, document, hasUnpublishedChanges }`; `features/editor/getMyQuests.ts` → `QuestCard[]` (all statuses, newest first; title and cover from the draft).

### 4.3 Database functions

All `security definer`, `set search_path = ''`, `revoke execute from public`, granted to `authenticated` unless noted; user functions require `auth.uid()`. Every write function follows §3.10 (carry-over rule, lock, `saved_at` check, archive, delete, insert with an explicit column list, `saved_at = clock_timestamp()`, `saved_by`, `save_reason`) and returns `saved_at::text`. There is no `UPDATE` anywhere.

| Function | Does | Reason |
|---|---|---|
| `save_profile(p_based_on text, p_profile jsonb) → text` | `p_based_on` null = create (fails if a profile exists). A new handle is claimed in `handle_claims` (`OQ423` if any claim exists for another key, live or deleted) | `create` / `save` |
| `is_handle_available(p_handle text) → boolean` | No claim in `handle_claims` for another key (ever), not reserved | — |
| `create_trip(p_key uuid, p_template_id text default 'beach') → text` | Inserts `trips` and `trip_drafts` per §3.10 | `create` |
| `save_trip_draft(p_key, p_based_on, p_document jsonb) → text` | Archives + inserts the draft. Rejects > 15 photos (`OQ422`) | `save` |
| `publish_trip(p_key, p_based_on_draft, p_based_on_trip, p_visibility, p_title, p_slug, p_word_count) → jsonb {saved_at, slug, first_publish}` | Locks both rows; checks **both** `saved_at`s (`OQ409`); ≥ 3 and ≤ 15 photos; slug fixed if already published, else `p_slug` made unique among the owner's live slugs and tombstones (`-2`, `-3`, …); builds the new `trips` row per §3.10; archives the old one | `publish` |
| `set_trip_visibility(p_key, p_based_on, p_visibility) → text` | New `trips` row, slug unchanged | `visibility` |
| `set_trip_comments(p_key, p_based_on, p_on boolean) → text` | New `trips` row | `comments` |
| `delete_trip(p_key) → jsonb {handles, slug}` | Owner only. Inserts a tombstone (`url_hash`, `trip_key`) for the slug under every handle the owner has claimed (if ever published); deletes explicitly, in this order: legacy `places` and `photos` rows for the trip, `trip_drafts_archive`, `trip_drafts`, `trips_archive`, `trips`. B and C replace this function (`create or replace`) to delete their child rows first | hard delete |
| `get_trip(p_handle, p_slug)` (replaced) | Same arguments. Output built from an **explicit field list** (§4.1), never `to_jsonb(t)`: never returns `owner_key`, `saved_by`, `save_reason`, `search_text`, `published_draft_saved_at`, `started_at` or the raw `photos`/`places` documents. Photos as `{id, width, height, caption}` in document order; places as `{id, name, lat, lng, note, photo_id}` in document order; every absent optional value is emitted as JSON `null` (`TripRowsSchema` uses `.nullable()`). Never `takenAt`, `date`, `placeId` | anon + authenticated |
| `get_profile`, `list_sitemap_trips` (replaced) | Same arguments and fields, from the new columns (`pins` from `trips.places`); C extends `get_profile` | anon + authenticated |
| `geocode_cache_get(p_keys text[])`, `geocode_cache_put(p_key, p_result jsonb)`, `claim_geocoder_slot(p_user_key uuid, p_kind text) → integer` | §3.4 | service_role only |
| `run_retention_cleanup(p_now timestamptz default now())` | Deletes archive and log rows older than the §3.1 ages; B and C replace it to add their tables. Scheduled weekly (Sunday 03:00 UTC) by `pg_cron` | service_role only |

`save_reason` values: `create, save, publish, visibility, comments, delete` (0001's list plus `comments`; `unpublish` is unused because the MVP has no unpublish, only private). Insert-only tables (`handle_claims`, `removed_trip_urls`, `geocode_cache`, `geocoder_calls`) also carry `saved_at`, `saved_by` (null for system rows) and `save_reason = 'create'`.

### 4.4 Routes

| Route | Server/client | Loader | Metadata | Index | Sitemap |
|---|---|---|---|---|---|
| `/login?next&intent&ref` (changed) | server page + client form; in-app browser screen | — | title per intent | noindex | no |
| `/auth/callback?next` (changed; Google) | route handler | — | — | — | — |
| `/auth/confirm?token_hash&type&next` (new; email links) | route handler | — | — | — | — |
| `/ingest/[...path]` (new; PostHog proxy) | route handler | — | — | — | — |
| `/onboarding?next` (changed) | server | `getMyProfile` | — | noindex | no |
| `/quests/new` | client (Pick photos) | — | "Create a Quest" | noindex | no |
| `/quests/[key]/photos`, `/arrange`, `/review`, `/template`, `/preview`, `/share` | server shell + client step | `getQuestDraft` | "Create a Quest" | noindex | no |
| `/quests/[key]/view` | server | `getQuestDraft` (owner) → published document | Quest title | noindex | no |

All under `app/(app)/(create)/quests/` (no bottom bar; C's tabs live in `app/(app)/(tabs)/`). `proxy.ts` matcher gains `/quests/:path*`, `/home`, `/explore`, `/notifications`, `/settings/:path*`, `/welcome`. `robots.ts` disallows `/quests/`. The WIP's `/new` and `/trips/*` routes are not ported.

## 5. Database and storage

Migration file names below give the order; each builder uses the real creation timestamp when writing the file, keeping this order (Supabase refuses a local migration older than the last one applied remotely).

1. `20261031000007_read_own_photo_files.sql`: **copied unchanged** from `editor-wip-ref` (reviewed as safe; the preview project already ran it).
2. `…_08_profiles_keys.sql` (A-02):
   - **Foreign keys first, before any function that deletes a profile row:** drop `trips_owner_id_fkey` and `photos_owner_id_fkey` (both `on delete cascade` to `profiles`) and re-create them as `references public.profiles (id) on delete no action deferrable initially deferred`.
   - Rename `profiles.id → key` (the `profiles_id_fkey → auth.users (id) on delete cascade` stays: auth users are never re-inserted). Add `settings jsonb not null default '{}'`, `saved_at`, `saved_by`, `save_reason`. Create `profiles_archive`, `handle_claims` (backfilled from current handles), `save_profile`, `is_handle_available`.
   - **Replace `get_trip`, `get_profile` and `list_sitemap_trips` in the same migration** (`create or replace`, same arguments, byte-for-byte the same output), changing only `profiles.id`/`p.id` to `profiles.key`/`p.key`. SQL function bodies are stored as text, so a column rename doesn't rewrite them; without this, every Quest page would fail between migrations 8 and 9. They still read the trips columns of migrations 1–7; migration 9 replaces them again.
   - **`supabase/seed.sql`**: A-02 changes the profiles insert to the `key` column (trips and photos inserts unchanged until A-03), so the seed runs after migration 8 alone.
   - Replace `own profile` (`for all`) with `select` only; revoke `insert, update, delete` on `profiles` from `authenticated` and `update` from `service_role`.
3. `…_09_trips_documents.sql` (A-03):
   - **Foreign keys first:** drop `trips_cover_photo_fk` (the cover is a photo key inside the document, so new cover keys are never in the legacy `photos` table); drop `photos_trip_id_fkey`, `places_trip_id_fkey`, `places_photo_id_fkey` and the `photos_owner_id_fkey` re-created in 8. The legacy `photos`/`places` tables become frozen copies with no foreign keys, so no save can cascade into them; `delete_trip` and account deletion delete their rows explicitly.
   - Rename `trips.id → key`, `owner_id → owner_key`, `cover_photo_id → cover_photo_key`. Re-create `trips_owner_id_fkey` as `trips_owner_key_fkey → profiles (key) on delete no action deferrable initially deferred`. Add `photos jsonb`, `places jsonb` (backfilled from the legacy tables, including `places.photo_id → photoId` and `photos.taken_at → takenAt` + `date`), `comments_on`, `search_text`, `published_draft_saved_at`, `started_at`, `saved_at`, `saved_by`, `save_reason`. Then **drop the defaults** on `seed`, `visibility`, `status`, `comments_on` (§3.10).
   - Create `trip_drafts` (backfilled from `trips`; `trip_drafts_key_fkey → trips (key) on delete no action deferrable initially deferred`, `trip_drafts_owner_key_fkey → profiles (key)` the same), `trips_archive`, `trip_drafts_archive`, `removed_trip_urls`, `geocode_cache`, `geocoder_calls`.
   - Drop `trips_touch_updated_at` and `touch_updated_at()`. Replace `get_trip`, `get_profile`, `list_sitemap_trips`; create the save, geocoder and retention functions; `create extension if not exists pg_cron` and schedule `run_retention_cleanup` weekly (skipped where `pg_cron` isn't available, as in PGlite tests, which call the function directly).
   - Replace `for all` policies with `select` only on `trips`, `trip_drafts` and the archives (`owner_key = auth.uid()`); revoke `insert, update, delete` from `authenticated` and `update` from `service_role`. Indexes: `trips (owner_key, status, visibility, published_at desc)`, `trips using gin (search_text gin_trgm_ops)` (`create extension if not exists pg_trgm`; C uses it), `geocoder_calls (called_at desc)`, `geocoder_calls (user_key, called_at desc)`.
4. Later contract migration (not in the MVP): drop the legacy `photos` and `places` tables; make the optional `TripRowsSchema` fields required.

**Foreign key inventory after migration 9** (every key a save deletes and re-inserts is referenced only by `on delete no action deferrable initially deferred` keys; the check runs at commit, when the key exists again):

| Foreign key | References | Behaviour |
|---|---|---|
| `profiles_id_fkey` (`profiles.key`) | `auth.users (id)` | `on delete cascade` (account deletion removes children first, C) |
| `trips_owner_key_fkey` | `profiles (key)` | deferred, no action |
| `trip_drafts_key_fkey` | `trips (key)` | deferred, no action |
| `trip_drafts_owner_key_fkey` | `profiles (key)` | deferred, no action |
| legacy `photos`, `places` | — | none (frozen copies) |
| `trips_cover_photo_fk` | — | dropped |
| archive tables, `handle_claims`, `removed_trip_urls`, `geocode_cache`, `geocoder_calls` | — | none |
| B's and C's tables (`likes`, `comments`, `follows`, `notifications`, …) | `trips (key)`, `profiles (key)` | deferred, no action (B §5, C §5) |

- **RLS:** every new table has RLS on. Owner `select` on live and archive tables. No insert/update/delete grants or policies: writes only via the functions. `handle_claims`, `removed_trip_urls`, `geocode_cache`, `geocoder_calls`: no grants to `anon` or `authenticated`.
- **What each action archives:** draft autosave → `trip_drafts_archive`; publish, visibility, comments → `trips_archive`; profile save → `profiles_archive`; Quest delete → nothing kept (hard delete of live + archive rows + files). Retention per §3.1.
- **User delete:** `deleteQuest` removes `photos/{owner}/{key}/` and `exports/{owner}/{key}/`, then `delete_trip` deletes every row explicitly (above). Account deletion is spec C's `delete_account_data` (one function, explicit deletes, no cascades from data tables).
- **Storage:** paths and variants unchanged: `photos/{userId}/{tripKey}/{photoId}/thumb.webp | display.webp`, `exports/{userId}/{tripKey}/{photoId}/export.jpg`. A replaced photo always gets a new id. No Supabase image transformations.
- **Database tests (`tests/db/`):**
  - `migration8.test.ts` (A-02): with migrations 1–8 and the seed only (`createTestDatabase({ upTo: '08' })` in `tests/db/testDatabase.ts`), `get_trip` for the seed trip deep-equals the fixture captured from migrations 1–7, and `get_profile` and `list_sitemap_trips` return the same rows as before.
  - `profileSave.test.ts` (A-02): create; conflict on stale `saved_at`; archive row written; handle claimed by another user refused; **a profile save deletes nothing else** (row counts of `trips`, legacy `photos`, `places` unchanged for that user); `settings` and `created_at` survive a profile save.
  - `tripSave.test.ts` (A-03): create; draft save + conflict; two concurrent saves → one success, one `OQ409`; > 15 photos refused; publish copies the draft and archives; **a publish deletes nothing else** (row counts of `trip_drafts`, legacy `photos`/`places` and, once B lands, `likes`/`comments` unchanged); **publish with a cover photo key that isn't in the legacy `photos` table succeeds**; `seed`, `comments_on`, `published_at`, `slug` unchanged after publish, visibility change and comments switch; publish with a stale trip `saved_at` → `OQ409`; visibility change keeps the slug; unlisted first publish has a suffix; a tombstoned slug isn't reused; draft never visible through `get_trip`.
  - `getTrip.test.ts` (A-03): **deep equality** of every field the old `get_trip` returned for the seed trip (fixture captured from migrations 1–7) against the new output; the new output never contains `owner_key`, `owner_id`, `saved_by`, `search_text`, `takenAt`, `date`, `placeId`; absent `caption`, `note`, `photo_id` are JSON `null`.
  - `tripDelete.test.ts` (A-03): live + archive rows gone, legacy rows gone, tombstone written, other users' rows untouched.
  - `noUpdates.test.ts` (A-03, extended by B and C): for every live and archive table, `authenticated` and `service_role` can't `update`, and `authenticated` can't `insert` or `delete`.
  - `geocoder.test.ts` (A-03): cache put is idempotent; users can't read or write the cache or the call log; the limiter returns a wait when a call was made < 1 s ago and `-1` past the per-user limits.
  - `retention.test.ts` (A-03): `run_retention_cleanup` removes only rows older than each age; tombstones and claims stay.
  - `access.test.ts` updated for the renamed columns (existing cases keep passing).

## 6. Frontend

All app screens use `design-system/` only (decision 0002). New shared pieces the create flow needs go into `design-system/components/` (`Sheet`, `Toast` with an Undo action, `ProgressRing`, `Segmented`); a new colour or size is a design-system change first.

| Screen | Component (in `features/editor/`, unless noted) | States |
|---|---|---|
| 1. Sign in, in an in-app browser | `features/account/OpenInBrowser.tsx` | Android "Open in Chrome"; iOS steps + Copy link (copied state); "Email me a sign-in link" when enabled (F-A8, F-A9) |
| 3. Pick photos | `PickPhotos.tsx`, `PhotoTile.tsx` | empty grid; picking; per-photo progress; failed ("Retry", "Remove" after 3 tries); limit toast; Next disabled "Pick at least 3 photos"; offline banner "Waiting for a connection. Your photos are safe."; "Pick up where you left off?" when picks wait in IndexedDB |
| 4. Arranging | `Arranging.tsx` | one changing line ("Sorting by day…", "Finding places…", "Writing captions…"); fallback message then review; never a bare spinner |
| 5. Review pages | `ReviewPages.tsx`, `PageCard.tsx`, `PhotoSheet.tsx`, `MoveSheet.tsx`, `AddPhotos.tsx`, `PlaceField.tsx` (submit-only search, OSM credit) | as screen 5; white dot on undated photos; "+ Add photos · 12 of 15"; Undo toasts; save status ("Saved", "Saving…", "Couldn't save. Retrying."); conflict dialog; "Choose 15" for old trips |
| 6. Choose a template | `ChooseTemplate.tsx` | two previews using the creator's cover |
| 7. Preview | `PreviewQuest.tsx` | full-screen `TripPage`; bottom bar "Back to edit" / "Publish" |
| 8. Publish + share | `PublishSheet.tsx`, `ShareScreen.tsx` | title prefilled; visibility prefilled (settings default on first publish, current visibility on re-publish) with one-line help (Private adds "To remove photos completely, delete the Quest."); publishing; conflict; error; "Your Quest is live!" with Copy link (copied state), Share to WhatsApp (`https://wa.me/?text=`), Download for Instagram (→ B's export) |

State: Zustand store `features/editor/store.ts` (kept pattern from the WIP, rewritten for pages), with an undo stack of document snapshots (max 20). `useAutosave` (kept pattern): debounce 1.5 s, sends `basedOn`, stores the returned `savedAt`.

Upload resilience (A-10): the queue pauses on `offline` and resumes on `online`; processed blobs wait in IndexedDB (`features/editor/pendingUploads.ts`, keyed by trip key + photo id) until uploaded, so a reload or "Continue editing" resumes them. A photo counts as part of the Quest once its entry is in the draft document (after its thumb and display finish).

Templates are untouched by this spec (B owns them); the preview uses `getTemplate(templateId).TripPage`.

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| Every new table: RLS on, owner-only, database test | Yes | §5; select-only owner policies; writes only via functions; tests listed, plus `noUpdates.test.ts` per table |
| No anonymous `select` policy | Yes | None added. Public reads stay functions |
| No `UPDATE` (0001) | Yes | No update grants/policies/triggers; `touch_updated_at` removed; actions only `.rpc()`; the geocoder limiter is insert-only |
| Saves can't destroy data | Yes (new) | Foreign key inventory (§5); carry-over rule (§3.10); tests that a profile save and a publish delete nothing else |
| Never store photo GPS | Yes | GPS only in browser memory; rounded to 2 decimals before `nameLocations`; stored coordinates are Nominatim's town centre; files re-encoded without EXIF; worker-output test (LLD §10) |
| `takenAt`, `date`, `startedAt` owner-only | Yes | `get_trip` uses an explicit field list; `getTrip.test.ts` asserts it |
| No user text in logs or analytics | Yes | `action()` logs error names only; PostHog config with autocapture, replay and automatic pageviews off and a property allowlist (§3.9); Sentry scrubbing (§3.9); the model input is built on the server from dates + town names |
| Unlisted URLs not leaked | Yes | Suffix kept; `Referrer-Policy` unchanged; PostHog sends path templates only; `events.test.ts` asserts an event fired on `/@h/slug-k3f9x2` carries no path, handle or slug |
| Secret key only in `lib/supabase/admin.ts` | Yes | Used by the geocoder cache/limiter, retention, account deletion (C) and email (B), all importing it from there. `ANTHROPIC_API_KEY`, `POSTHOG_KEY`, `GEOCODER_CONTACT_EMAIL` read only in `server-only` modules |
| `getUser()` on the server | Yes | `action()` already does; functions use `auth.uid()` |
| Open redirect | Yes | `safeNext()` only allows same-origin relative paths; the in-app "Open in Chrome" link reuses the same checked URL |
| Cost and policy abuse (model, geocoder) | Yes | Ownership of `key` on every call; ≤ 5 points; 10 reverse lookups / 20 searches per user per 10 minutes; global 1/s; captions only when missing |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content` | `DaySchema` gains optional fields | All optional; `titleSource` default in `toTripData()`; no limit narrowed (photoIds max 40, days max 30 stay; 15/5/3 enforced in the action and save function) | `toTripData.test.ts` with an old-shape fixture (no `titleSource`, 6 days, 20 photos on a day) |
| Places and their photos | v1 `places.photo_id` | Backfilled into `places[].photoId`; `get_trip` keeps returning `photo_id` | `getTrip.test.ts` deep equality |
| Drafts in progress | Only test trips; WIP never merged | Backfill puts each trip's current content into `trip_drafts` | migration test on seed data |
| Migrations | Column renames break the **old onboarding write** (`profiles.upsert({id})`) if code is rolled back after migration 8 | Read paths stay compatible (same `get_*` fields). Accepted because there are no real users (C-A2). Foreign keys are made safe in the same migration that adds delete-and-insert saves, so no partial deploy can delete data | `profileSave.test.ts`, `tripSave.test.ts` "deletes nothing else" |
| Archived rows | New | Parsed with the same schemas as live rows | `tripSave.test.ts` reads an archive row through `QuestDocumentSchema` |
| `get_trip` | Rewritten | Explicit field list; every old field returned with the same type (`id`, `updated_at`, `cover_photo_id` as aliases; `status`, `word_count`, `places[].photo_id` kept); new fields optional in zod | `getTrip.test.ts` |
| Migration 8 alone | A-02 can be merged and pushed before A-03 | Migration 8 replaces the three `get_*` functions for the renamed column and A-02 updates `seed.sql`, so Quest pages, profiles and the sitemap keep working with only migration 8 applied | `migration8.test.ts` |
| Code vs migration order | Vercel deploys on merge | **Quest pages render either way:** new code on the old `get_trip` parses (new fields optional, `toTripData` falls back to `id` and `comments_on ?? true`); old code on the new `get_trip` parses (superset of old fields; zod drops unknown keys). Writes need the new functions, so creation is broken only during the gap | unit test parsing both fixtures |
| `get_profile`, `list_sitemap_trips` | Rewritten | Same arguments, same fields | existing `access.test.ts` |
| Public URLs | Slug rule changes only for future publishes | Existing slugs untouched; handle changes redirect (C) | `publishSlug.test.ts` |
| Existing trip rendering | Beach becomes paged (B); `jitter` keys unchanged; `seed` carried by every save | Existing test trips are expected to change look (no real users; PRD replaces v1) | B's old-shape fixture; seed tests |
| Storage | None | Paths, variants and buckets unchanged | — |
| Actions, tags, env, events | Tags stay URL-based plus `trip-social:{key}`, `explore`, `guide-quests`; new env `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_KEY`, `GEOCODER_CONTACT_EMAIL`, `SENTRY_DSN`; event names are the CSVs' | `.env.example` updated; analytics schema test | `events.test.ts` |

**Deploy order:** migrations 7 → 8 → 9 (CTO, `supabase db push`, preview project first) **immediately before** merging A-02/A-03/A-04's code. Quest pages keep rendering in either order (above); only creation waits for both.

## 9. Performance and cost

- Upload: thumb (~40 KB) + display (~300 KB) first, export (~700 KB) last; 3 in parallel; one image decode at a time (phone memory).
- Arranging: < 10 s typical, 60 s budget. Geocoding ≤ 5 s (cache first, then sequential at 1/s), captions ≤ 8 s.
- Captions: ≈ $0.0005 per Quest (Haiku 5.5). 1,000 Quests ≈ $0.50.
- Geocoding: free (Nominatim). ≤ 5 reverse lookups per Quest, fewer as the cache fills. Two creators arranging at the same moment share the 1/s slot; the second may get fewer place names within its 5 s budget (acceptable for a friends test; the fallback provider removes this before launch).
- Storage: ~17 MB per 15-photo Quest with `export.jpg`. 1,000 Quests ≈ 17 GB, inside Supabase Pro's 100 GB.
- PostHog: inside the 1M events/month free tier for a friends test.

## 10. Analytics

From `docs/analytics/client-events.csv` and `server-events.csv` (exact properties and allowed values there). This spec fires:

| Event | Type | Fired by | Notes |
|---|---|---|---|
| `app_opened` | client | root layout, once per load | `entry` (direct / shared_link / email / notification), `referrer` (whatsapp / instagram / other / none), `signed_in` |
| `sign_in_started` | client | Continue with Google / Email me a sign-in link | `method`; `source` = intent (`comment`, `like`, `make_your_own`) or `app_open` |
| `user_signed_up` | server | `setHandle` (first profile) | `method`, `source`, `referrer_quest_id` (from `ref`) |
| `user_signed_in` | server | `/auth/callback` for an existing profile | `method` |
| `username_set` | server | `setHandle` / `saveProfile` (C) | `changed`, `length` |
| `quest_create_started` | client | any entry into the flow | `source` ∈ `QuestCreateSource` |
| `photo_limit_hit` | client | 16th pick | `screen` (pick / add_photos), `quest_id` optional |
| `photos_picked` | client | Next on Pick photos | `quest_id`, `count`, `with_dates`, `with_location`, `no_metadata` |
| `quest_draft_created` | server | `createQuest` (on Next) | `quest_id`, `source` |
| `photos_uploaded` | server | `reportCreateProgress({ uploaded })` when the queue empties | `count`, `failed`, `heic`, `bytes_total` |
| `quest_arranged` | server | `reportCreateProgress({ arranged })` | `pages`, `photos`, `captions_written`, `fallback_used`, `failed`, `duration_ms` |
| `draft_resumed` | client | "Continue editing" | `source` (home / quests_tab) |
| `review_edit` | client | every review change or blocked change | `action` (title / caption / date / place / move / swap / new_page / remove / replace / add / rename_page / undo), `page`, `blocked`, `caption_was_auto`, `count` |
| `template_selected` | client | template tap | `template`, `changed_from` |
| `quest_previewed` | client | Preview opens | `pages` |
| `quest_published` | server | first publish | `visibility`, `default_visibility`, `template`, `photos`, `pages`, `minutes_since_start` (from `startedAt` = first photo picked, as the PRD measures), `is_first_quest` |
| `quest_updated` | server | re-publish | `visibility` |
| `quest_link_shared` | client | Copy link / Share to WhatsApp on the share screen | `channel` (copy / whatsapp / native_share), `source: publish_screen`, `is_owner` |
| `quest_visibility_changed` | server | `setQuestVisibility` (not on re-tapping the same option) | `from`, `to`, `source: quest_menu` |
| `quest_comments_toggled` | server | `setQuestComments` | `on` |
| `quest_deleted` | server | `deleteQuest` | `likes`, `comments` |

**Sheet change requests** (not sent until the sheet adds them and is re-exported): an event for the in-app browser screen (shown / which option), and `quest_link_shared.source = quest_menu` for the ⋯ "Share link" (C). Until then those taps send nothing.

**Viewer → creator attribution (PRD question):** "Make your own Quest" links carry `?ref={tripKey}`; login, the in-app screen and onboarding carry it through; `user_signed_up` gets `referrer_quest_id`. Because `anon_id` survives sign-in and PostHog merges it with the user, "opened a shared Quest then published within 14 days" is a PostHog funnel on one person (`quest_viewed` with `is_owner = false` → `quest_published`). No database column.

## 11. Test plan

- **Unit (Vitest):** `arrange.test.ts` (every PRD M3/M4 case and edge-case row); `pageTitle.test.ts`; `pageEdits.test.ts` (move to space, swap on full page, remove blocked at 3, empty page disappears, new page only under 5, replace keeps slot, undo restores exactly, date change doesn't move); `publishSlug.test.ts`; `lib/auth/next.test.ts`; `inAppBrowser.test.ts` (Instagram iOS/Android, Facebook, WebView detected; WhatsApp, Safari, Chrome not); `captions.test.ts` (prompt built only from stored dates and town names, trims to 60, timeout → `[]`); `geo.test.ts` (User-Agent with contact, `zoom=10`, cache first, sequential, 5 s budget → null, no calls when `GEOCODER_CONTACT_EMAIL` is unset); `toTripData.test.ts` (old-shape + new fields; old and new `get_trip` fixtures both parse); `uploadQueue.test.ts`; `events.test.ts` (unknown event/property/value rejected; no path, handle or slug on an event fired on an unlisted Quest URL; `before_send` drops `$current_url` etc.); `sentry.test.ts` (scrubber removes bodies and long strings); GPS-free worker output (LLD).
- **Database (`tests/db/`):** listed in §5.
- **Backward compatibility:** old-shape `content` fixture; `getTrip.test.ts` deep equality on the seed trip.
- **Playwright:** B-11's smoke test covers create → publish → view signed out → export.
- **Human UX test (preview build):** PRD tasks 1, 2, 3; plus open a Quest link from an Instagram story and sign in to like (proposed addition, F-A9).

## 12. Tasks

"Now" = can start today. Frontend tasks start on sample data once A-01 (the contract types, same day) and their listed dependencies are merged.

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| A-01 | Backend | Contract files | `lib/trip/limits.ts`, `lib/trip/schema.ts`, `lib/trip/types.ts`, `lib/trip/cards.ts`, `lib/profile/schema.ts`, `lib/analytics/sources.ts`, `lib/trip/toTripData.ts` (+ test) | contract for all | — (**now**) | Schemas exactly as §4.1; old and new `get_trip` fixtures parse; `draftToTripData` added |
| A-02 | Backend | Profiles under 0001: migrations 7 (copied) and 8, `setHandle` through `save_profile` | `supabase/migrations/20261031000007_read_own_photo_files.sql`, `supabase/migrations/…_08_profiles_keys.sql` (incl. the three `get_*` replacements), `supabase/seed.sql` (profiles insert only), `tests/db/{profileSave,migration8}.test.ts`, `tests/db/fixtures/getTrip-v1.json` (created here), `tests/db/access.test.ts`, `tests/db/testDatabase.ts` (`upTo` option), `features/account/actions.ts`, `features/account/getCurrentUser.ts`, `lib/handles.ts` (+ test), `lib/supabase/database.types.ts` | M1 (onboarding), 0001 | A-01 | `profileSave.test.ts` passes incl. "deletes nothing else"; `migration8.test.ts` passes; no `.upsert` left; reserved list extended |
| A-03 | Backend | Trips under 0001: migration 9 (FKs, documents, drafts, archives, save/geocoder/retention functions, `get_*` rewritten) | `supabase/migrations/…_09_trips_documents.sql`, `supabase/seed.sql`, `tests/db/{tripSave,tripDelete,getTrip,noUpdates,geocoder,retention,access}.test.ts`, `features/trip-page/getTrip.ts` (schema only), `lib/supabase/database.types.ts` | M2, M8, M14, M16, 0001 | A-02 | All §5 trip tests pass; `/@handle/slug` renders the seed trip |
| A-04 | Backend | Quest write actions + loaders | `features/editor/{actions,publishActions,publishSlug,refreshTrip,getQuestDraft,getMyQuests}.ts` (+ tests), `lib/storage.ts`, `lib/cacheTags.ts`, `lib/trip/countWords.ts`, `lib/supabase/browser.ts` | M8, M14, M16, M28 (backend), edge cases | A-03 | Every §4.2 action except arranging ones; both publish conflict checks; sweep skips objects < 1 h old; tags incl. `explore`, `guide-quests` |
| A-05 | Backend | Arranging logic, geocoder, captions | `features/editor/{arrange,pageTitle,groupDays,suggestPlaces,arrangeActions}.ts` (+ tests), `lib/geo.ts` (rewrite), `lib/captions.ts` (+ tests), `lib/supabase/admin.ts`, `.env.example` | M3, M4 | A-01 (**pure parts now**); actions need A-03 | `arrange.test.ts` covers every M3/M4/edge row (F-A1/F-A10 rule isolated); `geo.test.ts` passes |
| A-06 | Backend | Sign-in return paths (Google callback + email `/auth/confirm`) | `lib/auth/next.ts` (+ test), `lib/auth/confirm.test.ts`, `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `features/account/actions.ts` (`signInWithEmail` redirect only, after A-02), `app/(auth)/login/page.tsx` (params only), `app/(app)/onboarding/page.tsx` (redirect only), `features/account/LoginForm.tsx` (pass `next`, `ref`), `proxy.ts`, `docs/runbooks/auth.md` (redirect URLs + both email templates) | M1, M10/M11 (return) | A-02 | `next`, `intent`, `ref` survive Google and email links + onboarding, including an email link opened in a different browser; unsafe `next` → `/home` |
| A-07 | Backend | Analytics + Sentry plumbing | `lib/analytics/{events,client,server,anonId,pageview}.ts` (+ tests), `app/ingest/[...path]/route.ts` (+ `ingestProxy.test.ts`), `app/layout.tsx` (providers only), `sentry.*.config.ts`, `lib/sentryScrub.ts` (+ test), `package.json` | analytics, privacy | — (**now**; CSVs exported 10 Nov) | Schemas generated from the CSVs; config exactly as §3.9; privacy tests pass |
| A-08 | Frontend | Create-flow design-system pieces | `design-system/components/{Sheet,Toast,ProgressRing,Segmented}.tsx` (+ any token change agreed with the founder) | M2, M5, M8 | — (**now**) | Typed, tokens only, `noRawStyles` passes |
| A-09 | Frontend | Pick photos screen on sample data | `features/editor/{PickPhotos,PhotoTile}.tsx`, `app/(app)/(create)/quests/new/page.tsx`, `lib/demo/samplePhotos.ts` | M2 | A-01, A-08 | Limits, counter, copy and states as screen 3 |
| A-10 | Frontend | Image worker + upload queue (port from WIP) | `features/editor/{image.worker,imageSize,upload,pendingUploads}.ts` (+ tests), `package.json` (`exifr`, `zustand`, lazy `heic2any`) | M2, edge cases | — (**now**; real uploads need A-03) | Thumb/display first, export last; offline pause/resume; IndexedDB resume; HEIC fallback; GPS never leaves the page. Owns `image.worker.ts` before C-10 adds the avatar size |
| A-11 | Frontend | Arranging + Review pages on sample data | `features/editor/{Arranging,ReviewPages,PageCard,PhotoSheet,MoveSheet,AddPhotos,PlaceField}.tsx`, `pageEdits.ts` (+ test), `store.ts`, `app/(app)/(create)/quests/[key]/{arrange,review}/page.tsx` | M3 (UI), M5 | A-01, A-08 (uses `arrange.ts` once A-05 lands, a stub before) | Every M5 check passes on sample data with Undo |
| A-12 | Frontend | Choose template, Preview, Publish sheet, Share screen | `features/editor/{ChooseTemplate,PreviewQuest,PublishSheet,ShareScreen}.tsx`, `app/(app)/(create)/quests/[key]/{template,preview,share,view}/page.tsx` | M6, M7, M8 | A-01, A-08, B-02 | Screens 6–8 match copy; visibility prefill rule; Mountain appears when B-04 lands |
| A-13 | Frontend | Wire the create flow to real data | `features/editor/*` (wiring only), `features/editor/useAutosave.ts`, `app/(app)/(create)/quests/[key]/photos/page.tsx` | M1–M8, M16 (edit), edge cases | A-04, A-05, A-06, A-09–A-12 | UX tasks 1–3 pass on the preview build; conflict dialog works across two tabs |
| A-14 | Frontend | Fire create-flow events | `features/editor/*`, `features/account/*` (track calls only) | analytics | A-07, A-13 | Every §10 event fires once with valid properties |
| A-15 | Frontend | In-app browser sign-in | `lib/auth/inAppBrowser.ts` (+ test), `features/account/OpenInBrowser.tsx`, `features/account/LoginForm.tsx` (after A-06), `app/(auth)/login/page.tsx` (render switch only) | M1, M10, M11 | A-06, A-08 | Instagram/Facebook in-app browsers get the screen on iOS and Android; `next`/`intent`/`ref` survive Copy link, Open in Chrome and the email link (requested in Instagram, opened in Safari/Chrome via `/auth/confirm`); copy per F-A9 |

**Shared files, in order:** `supabase/seed.sql` A-02 → A-03; `tests/db/testDatabase.ts` A-02 → A-03; `features/account/actions.ts` A-02 → A-06 → C-05; `proxy.ts` A-06 → C-01; `app/(app)/onboarding/page.tsx` A-06 → C-02; `app/auth/callback/route.ts` and `app/auth/confirm/route.ts` A-06 → C-05; `features/account/LoginForm.tsx` A-06 → A-15; `features/editor/image.worker.ts` A-10 → C-10; `lib/supabase/admin.ts` A-05 (creates it) → B-06 → C-05; `.env.example` A-05 → B-06 → C-05; `features/trip-page/getTrip.ts` A-03 → B-05 → C-05; `tests/db/tripSave.test.ts` A-03 → B-01; `tests/db/noUpdates.test.ts` A-03 → B-01 → C-03. (`next.config.ts`: only C-09 edits it now, since A-07's proxy is a route handler.)

## 13. Decisions

| Decision | Options considered | Choice | Reason | CTO sign-off? |
|---|---|---|---|---|
| Spec split | One spec; split by screen; split by data owner | Three specs by data owner | Each reviewable and shippable alone | Yes |
| 0001 archive location | Archive tables; `archived_at` flag | Archive tables, PK `(key, saved_at)`, no other constraints | Simple uniqueness and RLS | Yes (C-A1) |
| Trip document size | Per-table archiving; one document | One document | Cheap saves at 15 photos | Yes (C-A1) |
| Drafts | Every autosave archives the published row; separate draft table | `trip_drafts` table | Edits go live on Publish | Yes (C-A1) |
| Foreign keys | Cascades; deferred no-action; none | Deferred no-action on live keys; legacy tables and archives without FKs | Delete-and-insert saves must never cascade | Yes (C-A1) |
| Save carry-over | Rebuild rows from inputs; copy live row and override | Copy and override, no defaults | `jitter` seed and `comments_on` must survive | No (rule) |
| Draft creation moment | First pick; Next | Next, with a browser-made key from the first pick | Matches the taxonomy's `quest_draft_created` | No |
| `get_trip` field names | Rename `id` → `key`; keep both | Keep aliases, explicit field list, new fields optional in zod | CLAUDE.md: never remove returned fields; deploy-order safety | Yes (C-A3) |
| Slug after visibility changes | New suffixed URL (docs/03); never change | Never change | PRD M28 | Founder confirm (F-A4) |
| Removed photo files | Delete at once; at next publish; at Quest delete | At next publish, skipping objects < 1 h old | Undo, in-flight uploads | Yes (C-A4) |
| Caption model | Haiku 5.5; others; templates | Haiku 5.5 | — | Decided (C-A6) |
| Geocoder | Mapbox; MapTiler; Nominatim; Geoapify | Nominatim with a Postgres cache and limiter | Free, policy-compliant at friends-test volume | Decided (C-A7) |
| Limiter shape | Single-row counter; insert-only call log + advisory lock | Insert-only log + advisory lock | Same guarantee without an `UPDATE` (0001) | No |
| Export variant | Keep `export.jpg`; export from display | Keep, uploaded last | Stories need > 1600 px for full-bleed crops | No |
| What to keep from the editor WIP | — | Table in §16 | — | No |

## 14. Risks and open questions

### Decided by the CTO (10 Nov 2026), recorded

- **C-A6.** Captions by Claude Haiku 5.5 (`claude-haiku-5-5`), ≈ $0.0005 per Quest, 8 s cap; new secret `ANTHROPIC_API_KEY`; Anthropic in the privacy policy.
- **C-A7.** Geocoder: OpenStreetMap Nominatim, with the design in §3.4: a `geocode_cache` table cached forever (ODbL), a global 1/s limiter in Postgres held in a short transaction (no sleeps holding connections), ownership checks and per-user limits on `nameLocations` and `searchPlaces`, submit-only search, sequential lookups inside the 5 s budget (no place name on timeout), User-Agent contact from `GEOCODER_CONTACT_EMAIL` (value from the CTO), OSM credit. Geoapify or a paid provider before a public launch.
- **C-A9.** Stay on Vercel Hobby for the MVP (no monetisation). Risk recorded (the Reviewer reads Hobby's terms as non-commercial, and Hobby allows one team member): move to Pro the day Vercel flags anything or something earns money. Preview deployments write to the Supabase preview project.
- **C-A11.** The Supabase preview project is on the Pro organisation (set up), so no free-tier pausing or 1 GB limit.
- **C-A13.** `publish_trip` checks the live trip row's `saved_at` as well as the draft's; conflict copy "This Quest changed on another device. Refresh to see the latest."; re-publish defaults to the Quest's current visibility.
- **C-A14.** Archive retention by a weekly `pg_cron` job (ages to confirm in C-A12).
- **C-A15.** Usernames are unique and never reused, even after account deletion (`handle_claims` kept forever).

### Decisions needed

**Founder**

- **F-A1. Arranging vs the M3 check.** A page holds 3 photos (review screen, prototype), so "12 photos over 3 days → 3 pages, one per day" can't happen. Recommended: keep 3 per page and change the check to "12 photos over 3 days → 4 pages in date order; a page holds one day whenever 5 pages allow". Alternative: let a page hold up to 5 photos (needs new template layouts).
- **F-A2. New users arriving from a like, comment or "Make your own".** Recommended: pick a username, then go straight back to the Quest (or Pick photos), skipping the welcome screens; "What's a Quest?" on Home explains the same thing later.
- **F-A3. Editing a published Quest.** Recommended: changes stay in the draft until you tap Publish again; leaving without publishing keeps them for next time. Confirm (UX task 3 implies it).
- **F-A4. Links.** Unlisted Quests get 6 random characters at the end of the link (onquest.in/@riya/goa-trip-k3f9x2) so they can't be guessed; changing who can see a Quest never changes its link (so a Quest made unlisted after being public keeps its guessable link). Confirm.
- **F-A5. Place points for the route page.** We keep the town's centre point from OpenStreetMap (e.g. the centre of Panjim), never where the photo was taken. Confirm this fits "only the place name is kept".
- **F-A6. Replace photo.** Recommended: the new photo takes the slot and keeps the old caption; its own date and place win if it has them.
- **F-A7. Old test trips with more than 15 photos.** Confirm: they still play (in the new paged look), and editing asks to choose 15.
- **F-A8. "Email me a sign-in link" on the sign-in screen.** It needs Resend set up as the sign-in email sender (Supabase's built-in sender allows only a few emails an hour) and the custom email templates that link to `/auth/confirm` (§3.8), so the link works even when it's opened in a different browser from the one that asked for it. Recommended: ship it, since Resend is set up for notifications anyway (spec B), and it is the only sign-in that works for someone who opened the Quest inside Instagram (F-A9). The alternative is to hide it and offer Google only.
- **F-A9. Signing in from inside Instagram (and Facebook).** Google blocks sign-in in those apps' built-in browsers, and Instagram story links open there. Recommended screen, in place of "Continue with Google": title "Open in your browser to sign in", line "Instagram's browser doesn't allow Google sign-in.", primary "Email me a sign-in link" (once F-A8 ships with the `/auth/confirm` route, which signs in wherever the email is opened), then "Open in Chrome" on Android or "Tap ⋯ then Open in browser" with "Copy link" on iPhone. Confirm the copy and order, and add a UX check: open a Quest from an Instagram story and like it.
- **F-A10. Undated photos in a mixed trip.** The PRD says they "join the nearest page in pick order"; the spec (and prototype) fill the last page's free slots, then new pages. Confirm the spec's rule, or define "nearest".
- **F-A12. When a draft starts.** The draft (and its Draft card on Home) now starts when you tap Next on Pick photos, matching the taxonomy's `quest_draft_created`. The PRD's edge case "Leaving mid-creation: the draft is saved and appears on Home with a Draft tag" is then true from Next on; someone who leaves while still picking gets "Pick up where you left off?" on the same phone only, and nothing on Home or on another device. Recommended: keep it (a half-picked set is rarely worth a card, and empty drafts would clutter Home and the completion metric). Alternative: create the draft at the first pick and move `quest_draft_created` there (a taxonomy change).
- **F-A11. Rollout flag.** The PRD says "behind a feature flag". Recommended: no flag in code (the v1 flow isn't live, so there is nothing to switch between) plus a kill switch `SIGNUPS_OPEN=false` that stops new accounts if strangers appear. The Reviewer recommends an invited-emails allowlist from day one, but that would also stop friends from signing in to like or comment, which breaks the loop the friends test measures. Choose one.

**CTO**

- **C-A1.** Answers to 0001's open questions: archive tables (PK `(key, saved_at)`, no other constraints); a trip is one document; a separate `trip_drafts` table; foreign keys as in the §5 inventory.
- **C-A2.** Migrations 8–9 rename `id → key` and revoke update grants. The old release's onboarding write breaks if code is rolled back; reads stay compatible and no deploy order can delete data. Accept.
- **C-A3.** `get_trip` keeps returning `trip.id`, `trip.updated_at`, `status`, `word_count` and `places[].photo_id`; `key`, `saved_at`, `comments_on` are added and optional in zod until the contract migration.
- **C-A4.** Removed or replaced photos' files are deleted at the next publish (skipping objects under an hour old) or Quest delete; archive rows may then point at missing photos.
- **C-A8.** PostHog with a persistent `anon_id`, the §3.9 config (no autocapture, no replay, template-only pageviews, property allowlist) and the `/ingest` proxy replaces cookieless mode; the privacy notice must say so.
- **C-A10.** CLAUDE.md needs a human edit after approval: public read functions list, the `trip-social:{key}`, `profile-url:{handle}`, `explore` and `guide-quests` tags, new feature folders, `/quests/*` routes. Agents may not edit it.
- **C-A16. Decision 0001 amendment needed (human edit): retention deletes of archived rows by the weekly job.** 0001 rule 7 allows real deletes only for a user's trip or account deletion; the weekly `run_retention_cleanup` deletes archived rows (including archived published Quests and profiles) after the C-A12 ages. Write an amendment to 0001 (or a decision 0003) permitting it before A-03 ships the job; until then the job is created but not scheduled.
- **C-A12. Retention ages (confirm the numbers):** archived likes, comments and follows 90 days; archived trips, drafts, profiles and notification reads 180 days; notifications 365 days; geocoder call log 1 day; email send log 7 days; URL tombstones and handle claims never deleted.

### Technical risks

- iOS Safari memory with 15 large HEIC files: one decode at a time (kept); test on a 3-year-old iPhone.
- `heic2any` is ~1 MB; loaded only after a decode fails.
- `pg_trgm` and `pg_cron` in PGlite tests: `pg_trgm` from `@electric-sql/pglite/contrib/pg_trgm`; `pg_cron` isn't available, so tests call `run_retention_cleanup` directly.
- Nominatim's usage policy must be re-checked by the A-05 builder before building (the Reviewer couldn't fetch it).
- Vercel Hobby terms (C-A9): accepted risk.

## 15. Later

Discard unpublished changes; "Unpublished changes" tag on cards; contract migration dropping legacy `photos`/`places` and making optional `get_trip` fields required; private bucket + signed URLs for private Quests; resumable uploads across devices; more than 15 photos; a paid geocoder before public launch.

## 16. Editor WIP (`editor-wip-ref`): keep, change, drop

Builders copy kept files with `git show editor-wip-ref:<path>` into their task branch and adapt them; nothing is merged from that branch as is.

| WIP file | Verdict | Task |
|---|---|---|
| `supabase/migrations/20261031000007_read_own_photo_files.sql` | **Keep unchanged** (same filename; preview already has it) | A-02 |
| `features/editor/image.worker.ts`, `imageSize.ts` (+ test) | **Keep**: EXIF read, re-encode (no EXIF), Safari WebP→JPEG fallback. Change: lazy HEIC fallback | A-10 |
| `features/editor/upload.ts` | **Keep** the queue (3 parallel, 3 retries, one worker). Change: export last, offline pause, IndexedDB pending store, Retry/Remove | A-10 |
| `lib/storage.ts` (`uploadPhotoFiles`, `deletePhotoFiles`), `lib/supabase/browser.ts`, `lib/cacheTags.ts` (`profileTag`) | **Keep**; add folder listing for the sweep and avatar paths (C) | A-04 |
| `features/editor/groupDays.ts` | **Keep** `tripDateKey`, `groupPhotosIntoDays`, `tripDateRange`. **Drop** `addPhotosToDays` | A-05 |
| `features/editor/suggestPlaces.ts` | **Keep**; cap clusters at 5, largest first | A-05 |
| `lib/geo.ts` | **Rewrite** for Nominatim (§3.4); keep only the `GeoPlace` shape | A-05 |
| `features/editor/publishSlug.ts` (+ test) | **Change**: slug fixed at first publish; visibility never changes it; avoid tombstoned slugs | A-04 |
| `lib/trip/countWords.ts` | **Keep** | A-04 |
| `features/editor/refreshTrip.ts` | **Keep** `refreshTripPages`; **drop** `recountWordsAndRefresh` (`.update`) | A-04 |
| `features/editor/actions.ts`, `publishActions.ts` | **Drop** the bodies (`.update`, `.upsert`, `.delete`, 80-photo limit). Keep the input validation ideas (`IsoDate`, date refine) | A-04 |
| `features/editor/getEditorTrip.ts` | **Change** to read `trip_drafts` | A-04 |
| `features/editor/store.ts`, `useAutosave.ts` | **Keep the pattern** (Zustand context, debounce, save status); rewrite state for pages, `savedAt`, undo | A-11, A-13 |
| `features/editor/dayEdits.ts` (+ test) | **Drop**; replaced by `pageEdits.ts` | A-11 |
| `steps/PhotosStep.tsx`, `steps/PublishStep.tsx` | **Reference only**; rebuild with the design system (they predate 0002) | A-09, A-12 |
| `steps/PlaceSearch.tsx` | **Reference** for the submit-only place field | A-11 |
| `steps/DaysStep.tsx`, `PlacesStep.tsx`, `PlaceSuggestions.tsx`, `WordsStep.tsx`, `EditorView.tsx`, `NewTripForm.tsx`, `MyTripsView.tsx`, `fields.tsx`, `editorInitial.ts` | **Drop** (v1 open-ended editor) | — |
| `app/(app)/new`, `app/(app)/trips/*` | **Drop**; replaced by `/quests/*` | — |
| `lib/trip/schema.ts` change (`MAX_PHOTOS_PER_TRIP = 80`, day photoIds 80) | **Drop**; limits live in `lib/trip/limits.ts`, stored limits unchanged | A-01 |
| `package.json` (`exifr`, `zustand`) | **Keep** | A-10 |
| Small edits to `metadata.ts`, `HandleForm.tsx`, `auth/callback/route.ts`, `docs/02-lld.md` | Re-apply only if still needed in the owning task | A-06 |

## 17. Changes in round 2 (plan review, 10 Nov)

- Review tech 1 (blocking): §5 foreign-key inventory; FKs made safe in migration 8 (before `save_profile`) and 9; legacy tables without FKs; `trips_cover_photo_fk` dropped; "deletes nothing else" tests.
- Review tech 2 (blocking): §3.10 carry-over table; defaults dropped; seed/comments_on tests.
- Review tech 3 (blocking): explicit `get_trip` field list; `places[].photo_id` kept (`TripPlaceSchema.photoId`); `status`, `word_count` kept; nulls; optional new fields; deploy-order table; deep-equality test.
- Review tech 5 (blocking): §10 rewritten from the CSVs; `createQuest` source enum; draft created on Next; `quest_arranged.duration_ms` etc. via `reportCreateProgress`; `minutes_since_start` from first pick.
- Review tech 6 (blocking): §3.8 in-app browsers, A-15, F-A9.
- Review tech 7 (blocking): §3.9 PostHog config and allowlist; Sentry scrubbing (review 23).
- Should-fix: Nominatim design (8, CTO); Hobby risk (9); re-publish visibility and trip conflict check (11); `explore`/`guide-quests` refresh (12); account deletion described once, in C (14); `writeCaptions({ key })` (17); sweep skips new objects and states the archive trade-off (18); concurrent-save conflict (19); archive constraints (20); row metadata and update-refused tests (21); task dependencies and shared-file order (25); retention (26). Notes 27, 29, 35, 36, 38.

## 18. Changes in round 3 (plan review round 2, 10 Nov)

- Round-2 blocker 1: migration 8 also replaces `get_trip`, `get_profile`, `list_sitemap_trips` for `profiles.key` (same output), A-02 owns the `seed.sql` profiles change, and `migration8.test.ts` proves the seed trip renders with migration 8 alone (§5, §8, A-02).
- Round-2 blocker 2: email sign-in uses custom templates with `token_hash` and a new `/auth/confirm` route with `verifyOtp`, so a link requested inside Instagram works in Safari or Chrome; Google keeps `/auth/callback` (§3.8, A-06, A-15, F-A8, F-A9).
- Should-fix 3: `/ingest` is a route handler forwarding only body, content headers and client IP; extra posthog-js captures off (note 11).
- Should-fix 5: decision 0001 amendment listed (C-A16); job not scheduled until it exists.
- Should-fix 6: shared-file order completed.
- Should-fix 9: only successful empty answers cached as "no result".
- Founder 4: drafts start on Next listed as F-A12.
