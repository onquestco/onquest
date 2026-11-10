# Spec A: Data model and create flow (OnQuest MVP)

| | |
|---|---|
| PRD | `docs/prds/onquest-mvp.md` (approved by the founder on 2026-11-09; social layer re-approved the same evening) |
| Status | Draft, for Reviewer plan review then CTO approval |
| Build mode | Backend + Frontend split. Frontend starts now on sample data; backend lands the data model first |
| Tracker IDs | One row per task in `docs/specs/onquest-mvp-tasks.md` (A-01 … A-14) |
| Sibling specs | B: `docs/specs/onquest-mvp-b-quest-page.md` (viewing, likes, comments, notifications, export). C: `docs/specs/onquest-mvp-c-social.md` (shell, home, feed, explore, guides, profiles, follow, settings, manage Quest) |

**Why three specs.** The PRD is 28 Must stories and 20 screens: one spec would be unreviewable and would block every screen behind the slowest piece. The split follows data ownership, so each spec can be reviewed and shipped on its own:

- **A (this spec)** owns every write to a Quest and to a profile row: the move to decision 0001 (keys, archives, save functions), the create flow (pick → arrange → review → template → preview → publish → share), the manage actions behind the ⋯ menu, sign-in return paths, and the analytics plumbing every other screen uses. Everything else reads what A writes, so A's backend goes first.
- **B** owns how a Quest is seen and reacted to: the paged Quest player and both templates, the Quest page with likes and comments, notifications (bell and email), view counting and the Instagram export (export lives with the templates because its frames are template components).
- **C** owns the signed-in app around Quests: bottom bar, welcome screens, Home and feed, Your Quests and the ⋯ menu UI, Explore, search, guides, profiles, follow, edit profile, settings and account deletion.

"Quest" is the product word; code and database keep `trip` (CLAUDE.md, `ScrapbookPage`, `TripData`), so no rename churn. App routes use `/quests/...` because users see them.

## 1. Summary

A creator picks 3 to 15 photos; the phone reads dates and rough locations, shrinks the photos (EXIF and GPS removed) and uploads them while OnQuest arranges them into up to 5 pages of up to 3 photos, names places and writes short captions. They can publish untouched or edit pages, pick Beach or Mountain, preview and publish as public, unlisted or private.

Technically: the schema moves to decision 0001 (one permanent `key`, archive tables, one Postgres save function per change, `saved_at` conflict check). A Quest becomes **one document** (content, photos and places in one row), with a separate **working draft** row so autosaves never touch the published Quest and edits go live only on Publish.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| M1: signed out on "Make your own Quest" → Google sign-in → lands on Pick photos | `safeNext()` + `/auth/callback?next=` + onboarding pass-through (A-06) | `lib/auth/next.test.ts`; UX task 4 |
| M2: 16th photo refused with "A Quest holds 15 photos. Remove one to add another." | `PickPhotos` limit, `MAX_PHOTOS` (A-09); `save_trip_draft` rejects > 15 (A-03) | `PickPhotos.test.tsx`; `tests/db/tripSave.test.ts` |
| M2: Next disabled with "Pick at least 3 photos" until 3 | `PickPhotos` (A-09) | `PickPhotos.test.tsx` |
| M3: 12 dated photos over 3 days → 3 pages, one per day | `arrangePages()` (A-05). **Conflicts with 3 photos per page; see Decisions needed F-A1** | `arrange.test.ts` |
| M3: 15 photos over 9 days → ≤ 5 pages titled with day range | `arrangePages()`, `pageTitle()` (A-05) | `arrange.test.ts` |
| M3: 7 undated photos → 3 pages (3, 3, 1), pick order, "Page 1"–"Page 3", no captions | `arrangePages()` (A-05) | `arrange.test.ts` |
| M4: Panjim photos → page title includes "Panjim", captions ≤ 60 chars | `nameLocations` + `writeCaptions` actions, `pageTitle()` (A-05) | `arrange.test.ts`, `captions.test.ts` (model mocked) |
| M4: no location → no caption | `writeCaptions` only receives photos with a place (A-05) | `captions.test.ts` |
| M5: move to a page with space; swap on a full page with Undo; remove blocked at 3; replace keeps slot with Undo; set date keeps page and updates page dates | `pageEdits.ts` pure functions + editor store undo stack (A-11) | `pageEdits.test.ts`; UX task 3 |
| M6: switch Beach → Mountain keeps photos and words | `document.templateId` only changes (A-12); Mountain template (B-04) | `pageEdits.test.ts` (template switch is a field change); UX task 3 |
| M7: preview = what a viewer sees, animated | Preview renders `toTripData()` of the draft through the same `TripPage` (A-12, B-02) | `toTripData.test.ts` draft path; UX task 1 |
| M8: unlisted → plays for signed-out friend, not on profile or search | `publish_trip` visibility; `get_trip`, `get_profile` and search filters (A-03, C-04) | `tests/db/tripSave.test.ts`, `tests/db/access.test.ts` |
| M8: private → "This Quest is private." | `get_trip_status()` (B-01) and Quest page state (B-07) | `tests/db/questStatus.test.ts` |
| M16 (edit part): edit after publishing | Draft row kept after publish; Publish copies it (A-03, A-04) | `tests/db/tripSave.test.ts`; UX task 3 |
| M16 (delete part), M28 (backend) | `deleteQuest`, `setQuestVisibility`, `setQuestComments` (A-04); UI in C-07 | `tests/db/tripDelete.test.ts` |
| Edge: leaving mid-creation keeps a Draft | Draft created on first pick; autosave (A-04, A-13) | Playwright smoke (B-12) |
| Edge: offline mid-upload, nothing lost; 3 failures → Retry and Remove | Upload queue pause/resume + IndexedDB pending store (A-10) | `uploadQueue.test.ts` |
| Edge: HEIC and very large photos accepted | `image.worker.ts` + lazy HEIC fallback (A-10) | Manual on iPhone + Android (UX task 1) |
| Product requirement: arranged draft ≤ 60 s after last upload (15 photos, 4G) | Arranging runs on metadata read at pick time, in parallel with upload (§3.3) | `quest_arranged.seconds` in PostHog; UX task 1 |

## 3. Approach

### 3.1 Data model under decision 0001

This spec answers the four open questions in `docs/decisions/0001-no-in-place-updates.md`:

| Question | Answer | Why |
|---|---|---|
| Where archived rows live | Separate `<table>_archive` per table, same columns plus `archived_at` | Live tables keep one row per key; unique constraints and RLS stay plain |
| How big a document is | **A trip is one document**: `content`, `photos` (jsonb array) and `places` (jsonb array) live on the trip row. The `photos` and `places` tables stop being written and are dropped in a later contract migration | With 15 photos, archiving one row per save is cheap; archiving 15 photo rows + places on every caption edit is not. Matches the document model 0001 leaned towards |
| Drafts | A separate **`trip_drafts`** table, one row per trip key, holds the working copy. Autosave archives only drafts. `trips` holds the published document; only publish, visibility, comments and delete touch it | Edits go live on Publish (UX task 3). `trips_archive` stays a readable history of what the public saw |
| Retention | Keep every archive row during the MVP. Revisit when `trip_drafts_archive` passes 10k rows (a cleanup of `save`-reason draft rows older than 30 days is the likely answer) | Rows are a few KB; there are no users yet |

Records and keys:

| Table | Key | Changes | Archive? |
|---|---|---|---|
| `profiles` | `key` = auth user id | `save_profile` (handle, name, bio, city, avatar, settings) | `profiles_archive` |
| `trips` | `key` (uuid, made on create) | `create_trip`, `publish_trip`, `set_trip_visibility`, `set_trip_comments`, `delete_trip` | `trips_archive` |
| `trip_drafts` | same `key` as its trip | `create_trip`, `save_trip_draft` | `trip_drafts_archive` |
| `handle_claims` | `handle` | Insert-only: every handle a profile has ever had, so old links redirect and nobody else can take them | none (rows never change) |
| `removed_trip_urls` | `url_hash` | Insert-only tombstone, `sha256(lower(handle) || '/' || slug)`, so a deleted Quest's link says "This Quest was removed." | none |
| Photos | `photos[].id` is the photo's permanent key (it is also the storage folder, which never changes) | Part of the trip document | with the document |

### 3.2 Create flow, end to end

```
Create a Quest ──(signed out?)──> /login?next=/quests/new&intent=create ──> back
/quests/new  Pick photos (3–15)
   ├─ on first pick: createQuest() → key; URL becomes /quests/[key]/photos
   ├─ per photo, in the image worker: read EXIF (date, GPS) → re-encode thumb/display/export (no EXIF)
   ├─ upload queue: thumb + display first, export.jpg last; 3 in parallel; retries; offline pause
   └─ GPS stays in browser memory only
Next ─> /quests/[key]/arrange  ("Sorting by day…" → "Finding places…" → "Writing captions…")
   ├─ arrangePages(): pages from dates (pure, instant)
   ├─ nameLocations(): GPS clusters (≤ 1 km), rounded to 2 decimals, → town names + town centre
   ├─ writeCaptions(): one model call for photos with a place (date + place only), 8 s timeout
   └─ saveQuestDraft() → review. Any failure → pick order, 3 per page, fallback message
/quests/[key]/review  ─ edits autosave (1.5 s debounce), Undo for move/swap/remove/replace/add
/quests/[key]/template ─ Beach | Mountain, each previewed with the creator's cover
/quests/[key]/preview  ─ real TripPage from the draft; "Back to edit" | "Publish" (sheet)
publishQuest() ─> /quests/[key]/share  "Your Quest is live!" Copy link · Share to WhatsApp · Download for Instagram (B)
```

Arranging needs only the photo metadata read at pick time, not finished uploads, so the 60 s target is met by design: grouping is instant, geocoding is ≤ 5 parallel calls (~1 s), captions are one model call (~2–4 s, capped at 8 s). The upload of 15 photos (~15 MB with `export.jpg`, ~5 MB without) is the long pole; `export.jpg` goes last so the draft and preview do not wait for it.

### 3.3 Arranging rules (`features/editor/arrange.ts`, pure)

Constants in `lib/trip/limits.ts`: `MAX_PHOTOS = 15`, `MIN_PHOTOS_TO_PUBLISH = 3`, `MAX_PAGES = 5`, `PHOTOS_PER_PAGE = 3`, `CAPTION_MAX = 60`.

1. Photo day = `tripDateKey(takenAt)` (kept from the WIP: local date of taken time minus 4 h, so 1 a.m. photos belong to the night before). Dated photos sort by `takenAt`; undated keep pick order.
2. **All dated photos on one day and more than 3:** pages of 3 in time order. Titles "Morning" (before 12:00), "Afternoon" (12:00–16:59), "Evening" (17:00+) by the page's first photo, used only when every page gets a different label; otherwise "Page N".
3. **Otherwise:** one or more pages per day, 3 photos each, never mixing days. If that plus `ceil(undated / 3)` pages is more than 5, fall back to pages of 3 in date order (pages may span days).
4. **Undated photos:** fill the last page's free slots, then new pages of 3, in pick order. 15 photos never need more than 5 pages.
5. **Titles** (`pageTitle()`, also used after every edit for pages whose `titleSource` is `auto`): one day → "Day N · Place"; several days → "Days A–B · Place" (N counted from the first trip day; Place = the most common place name on the page, omitted when none); no dates → "Page N". Page `startDate`/`endDate` = min/max photo `date` on the page.
6. **Quest title** default (`defaultQuestTitle()`): place + days → "4 days in Goa" / "A day in Panjim"; place only → "Panjim"; dates only → "October 2026"; nothing → the template's default title.
7. **Captions:** only photos with a place name get one; `captionSource: 'auto'`.

This is the prototype's rule (`arrange()` in the prototype). It does not satisfy the PRD's "12 photos over 3 days → 3 pages" check (4 photos a day cannot fit 3 slots a page): founder decision F-A1.

### 3.4 Places and GPS

- `exifr` reads GPS in the worker; it is returned to the page in memory, clustered with `suggestPlaces()` (kept from the WIP, ≤ 1 km, max 5 clusters), rounded to 2 decimals (~1 km) **before** leaving the phone, and sent to `nameLocations`. It is never uploaded, stored, logged or sent to analytics. The re-encoded files contain no EXIF.
- `lib/geo.ts` asks the geocoder for town-level results only (`place`/`locality` types) and returns the **town's** name and centre point. We store that centre so the route page can draw a path; it is public information about the town, not where a photo was taken (founder confirmation F-A5).
- A photo's place set by hand uses `searchPlaces` (kept from the WIP) and stores the same town-level fields.

### 3.5 Captions model

Recommendation (decided, C-A6): **Claude Haiku 5.5** through the Anthropic API, called from the `writeCaptions` server action, one request per Quest with all eligible photos (≤ 15 items, each `{ date?, place }`), asking for JSON `{ photoId, caption }[]`, each ≤ 60 characters.

| | Haiku 5.5 (chosen) | Gemini Flash-class | No model (templates like "Sunset in Panjim") |
|---|---|---|---|
| Cost per Quest (~600 input + ~400 output tokens) | ≈ $0.003 | ≈ $0.001 | $0 |
| Added time | 2–4 s, capped at 8 s | 1–3 s | 0 |
| Quality | Good short copy, follows JSON + length reliably | Good | Repetitive |
| New vendor | Yes (Anthropic) | Yes (Google) | No |

The input contains only dates and town names: no user text, no photos, no handles. Timeout or error → no captions (the Quest still looks finished); `quest_arranged.captions_written = 0`. Output is trimmed to 60 characters server-side and treated as plain text (React escapes it). New env var `ANTHROPIC_API_KEY` (server only, Production + Preview). Anthropic is added to the privacy policy's processor list. CTO decision C-A6.

### 3.6 Publish, URLs and visibility

- Slug is made from the title at **first publish** (`slugify`, ≤ 80 chars, `-2`, `-3` on clash with the owner's other Quests) and **never changes after**, so shared links never break; renaming a Quest later doesn't move it.
- First published as **unlisted** → the slug gets the existing 6-character random suffix (`unlistedSlug()`), as in `docs/03` §A.1.
- **Changing visibility never changes the URL** (PRD M28: "its link still works"). This replaces `docs/03` §A.1's "Public → Unlisted gives a new suffixed URL" (founder confirmation F-A4).
- Default visibility on the publish sheet = the creator's setting "New Quests start as" (C), which defaults to **Public** (PRD screen 8). `docs/03` §A.1 is updated.
- Private Quests keep their URL; a visitor sees "This Quest is private." (B).
- Handle changes (C) keep old links working through `handle_claims`.

### 3.7 Editing after publish, and removed photos

- The draft row stays after publish. "Edit Quest" opens it; changes autosave to the draft only; "Publish" copies the draft to `trips` (archiving the previous published row). Leaving without publishing keeps the changes in the draft (founder confirmation F-A3).
- A photo removed or replaced in the editor keeps its files until the **next publish** or the Quest's deletion: Undo and the draft archive still need them. `publishQuest` then lists the trip's storage folder and deletes files of every photo id that is in neither the new published document nor the draft. Until then a removed photo is reachable only by its exact URL (the `docs/03` §A.2 trade-off). CTO decision C-A4.
- Old test trips with more than 15 photos still render. Opening one in the editor shows "This Quest has N photos. Choose 15 to keep editing." (frontend), because `save_trip_draft` rejects more than 15.

### 3.8 Sign-in return paths (M1, and B's M10/M11)

`/login?next=<path>&intent=<create|like|comment|make_your_own>` → Google → `/auth/callback?next=...` → if no profile, `/onboarding?next=...` (pick username) → `next`. `safeNext()` accepts only same-origin relative paths starting with `/` (not `//`), else `/home`. The welcome screens (C) are skipped when there is a `next` (founder confirmation F-A2). The sign-in title switches by `intent` (screen 1 copy).

### 3.9 Analytics plumbing (`lib/analytics/`)

- **Source of truth for names and properties:** the OnQuest Taxonomy sheet. The PRD's table and the prototype already differ (`signed_up` vs `user_signed_up`, `followed` vs `user_followed`, `quest_managed` vs `quest_visibility_changed`, `quest_edited` vs `review_edit`, `profile_edited` vs `profile_updated`); the sheet wins. Before A-07 starts, the CTO exports the sheet's events tab to `docs/analytics/` (client-events.csv, server-events.csv, common-properties.csv) (the builders can't open Google Sheets). A-07 turns it into zod schemas in `lib/analytics/events.ts`; a test fails if code sends an event or property not in the file.
- **Client:** PostHog JS through a first-party proxy (`/ingest/*` rewrite in `next.config.ts`) so ad blockers don't hide viewers. Common properties per the sheet: `event_id`, `session_id`, `anon_id`, `platform`, `app_version`, `screen`. `anon_id` = a random uuid kept in `localStorage` (`oq_anon_id`), sent as PostHog's distinct id before sign-in and kept after it (`posthog.identify(userKey)` merges the two).
- **Server:** `posthog-node` from `lib/analytics/server.ts` (`import 'server-only'`), `type: 'server'`, `server_ts`, distinct id = the user key. Called after a successful write, inside `after()` so it never slows or fails the action.
- **Never** in any property: user text (titles, captions, comments, search text), emails, photo URLs, coordinates.
- Persistent `anon_id` means PostHog is no longer "cookieless" (`docs/03` §B.4): CTO decision C-A8.

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
  startDate: z.iso.date().optional(),               // new: page date range shown on the Quest
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
  geoRef: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  note: z.string().trim().max(300).optional(),
});

/** The editable document, as stored in trip_drafts and copied to trips on publish. */
export const QuestDocumentSchema = z.object({
  templateId: z.string(),
  title: z.string().trim().max(60).optional(),
  shortTitle: z.string().trim().max(30).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  coverPhotoId: z.uuid().optional(),
  content: TripContentSchema,
  photos: z.array(TripPhotoSchema).max(80), // stored limit (old trips); 15 enforced on save
  places: z.array(TripPlaceSchema).max(60),
});

// get_trip output: every existing field stays; new fields added.
export const TripRowsSchema = /* existing */ .extend({ trip: existingTrip.extend({
  key: z.uuid(),            // same value as `id` (kept as a compatibility alias)
  saved_at: z.string(),     // same value as `updated_at` (alias)
  comments_on: z.boolean().optional(), // default true
}) });
```

`lib/trip/types.ts`: `Day` gains `dateLabel?: string` (from `startDate`/`endDate` via `formatDateRange`). `TripData` gains `key: string` (`id` stays, same value, for existing templates). `toTripData()` applies: `titleSource` default, `dateLabel`, and nothing else new. It gains a second entry `draftToTripData(draft, owner, defaults)` for the preview, built on the same code path so preview = viewer (M7).

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
  likeCount: z.number().int().default(0),    // filled by B
  commentCount: z.number().int().default(0), // filled by B
  publishedAt: z.string().optional(),
  savedAt: z.string(),                  // opaque conflict token (see below)
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

**`savedAt` is an opaque string.** Postgres timestamps have microseconds; JavaScript `Date` keeps milliseconds. Save functions return `saved_at::text` and compare text; code never parses it with `Date`.

### 4.2 Server actions

All built with `action()`; domain errors are returned in `data` (the `setHandle` pattern), never thrown. `Conflict` = `{ saved: false, reason: 'conflict' }`; the UI says "This Quest changed on another device. Reload to see the latest." and offers Reload.

`features/editor/actions.ts`:

| Action | Input (zod) | Result data | Errors (in data) | Cache tags refreshed |
|---|---|---|---|---|
| `createQuest` | `{ source: z.enum(['home','profile','make_your_own','quests_tab','create_menu']) }` | `{ key, savedAt, photoFolder }` | — | none (draft) |
| `saveQuestDraft` | `{ key: uuid, basedOn: string, document: QuestDocumentSchema }` refined: photos ≤ `MAX_PHOTOS`, days ≤ `MAX_PAGES`, ≤ `PHOTOS_PER_PAGE` photo ids per day, every day photo id and place id exists in the document, no photo on two days | `{ saved: true, savedAt }` | `conflict`, `not_found`, `too_many_photos` | none (draft only) |
| `nameLocations` | `{ points: z.array({ lat, lng }).max(5) }`, each rounded to 2 decimals by the schema (`transform`) | `{ places: (GeoPlace \| null)[] }` | — (geocoder down → all null) | — |
| `searchPlaces` (kept) | `{ text: 2–100 chars }` | `GeoPlace[]` | — | — |
| `writeCaptions` | `{ key: uuid, items: z.array({ photoId: uuid, date: iso date optional, place: string ≤ 60 }).max(15) }` | `{ captions: { photoId, caption }[] }` (≤ 60 chars each; `[]` on timeout or error) | — | — |

`features/editor/publishActions.ts`:

| Action | Input | Result data | Errors | Cache tags |
|---|---|---|---|---|
| `publishQuest` | `{ key, basedOn (draft savedAt), visibility, title: 1–60 }` | `{ published: true, savedAt, path, url }` | `conflict`, `too_few_photos` (< 3), `too_many_photos`, `not_found` | `trip-url:{handle}/{slug}`, `trip-social:{key}`, `profile:{ownerKey}` |
| `setQuestVisibility` | `{ key, basedOn (trip savedAt), visibility }` | `{ saved: true, savedAt }` | `conflict`, `not_found` | `trip-url`, `profile` |
| `setQuestComments` | `{ key, basedOn, on: boolean }` | `{ saved: true, savedAt }` | `conflict`, `not_found` | `trip-social:{key}` |
| `deleteQuest` | `{ key }` | `{ deleted: true }` | `not_found` | `trip-url` (every handle in `handle_claims` × slug), `trip-social`, `profile` |

`publishQuest` computes `wordCount` with `countWords(toTripData(...))` (kept from the WIP) and passes it to `publish_trip`, then sweeps removed photo files (§3.7) inside `after()`. `deleteQuest` deletes storage first (both buckets, the whole `{userId}/{tripKey}/` folder), then `delete_trip` (so a failure leaves a retryable Quest, never orphaned rows).

`features/account/actions.ts`: `setHandle` keeps its input and result but calls `save_profile` (creates the profile and its first `handle_claims` row) instead of `.upsert()`. Its reserved list gains the new top-level routes: `home, explore, quests, notifications, welcome, guides, email, ingest, people`.

Loaders (server, owner only, through RLS): `features/editor/getQuestDraft.ts` → `{ key, savedAt, tripSavedAt, status, visibility, slug?, seed, ownerHandle, photoFolder, document }`; `features/editor/getMyQuests.ts` → `QuestCard[]` (all statuses, newest `savedAt` first; title and cover from the draft).

### 4.3 Database functions

All `security definer`, `set search_path = ''`, `auth.uid()` required, `revoke execute from public`, granted to `authenticated` unless noted. Every write function: lock the live row (`for update`), compare `saved_at::text` with `p_based_on` (raise `OQ409` on mismatch), copy the live row to the archive with `archived_at = now()`, delete it from the live table and insert the new row with `saved_at = clock_timestamp()`, `saved_by = auth.uid()`, `save_reason`. Returns `saved_at::text`. (Delete + insert of the live row inside one transaction is how the database itself keeps "a row never changes": there is no `UPDATE` anywhere.)

| Function | Does | Reason |
|---|---|---|
| `save_profile(p_based_on text, p_profile jsonb) → text` | `p_based_on` null = create (fails if a profile exists). Claims the handle in `handle_claims` (fails with `OQ423` if claimed by someone else) | `create` / `save` |
| `is_handle_available(p_handle text) → boolean` | Not in `handle_claims` for another key, not reserved | — |
| `create_trip(p_template_id text default 'beach') → jsonb {key, saved_at}` | Inserts `trips` (status draft, slug `trip-xxxxxx`, visibility from settings) + `trip_drafts` (empty document) | `create` |
| `save_trip_draft(p_key, p_based_on, p_document jsonb) → text` | Archives + inserts the draft. Rejects > 15 photos (`OQ422`) | `save` |
| `publish_trip(p_key, p_based_on_draft, p_visibility, p_title, p_slug, p_word_count) → jsonb {saved_at, slug}` | Checks draft `saved_at`; copies the draft document into a new `trips` row (status published, `published_at` kept from the first publish, slug kept if already published, `search_text` built from title + place names); archives the old `trips` row. ≥ 3 and ≤ 15 photos | `publish` |
| `set_trip_visibility(p_key, p_based_on, p_visibility) → text` | New `trips` row, slug unchanged | `visibility` |
| `set_trip_comments(p_key, p_based_on, p_on boolean) → text` | New `trips` row | `comments` |
| `delete_trip(p_key) → void` | Inserts tombstones for the slug under every handle the owner has claimed; hard-deletes the trip's live and archived rows in `trips`, `trip_drafts` and their archives (B and C add likes, comments, notifications for that trip via `on delete cascade` or explicit deletes in this function) | hard delete |
| `get_trip(p_handle, p_slug)` (replaced) | Same arguments and every returned field, now read from the new columns; adds `trip.key`, `trip.saved_at`, `trip.comments_on`. `trip.id` = key, `trip.updated_at` = saved_at, `cover_photo_id` = cover photo key. Photos returned as `{id, width, height, caption}` only (never `takenAt`, `date`, `placeId`) | anon + authenticated |
| `get_profile`, `list_sitemap_trips` (replaced) | Same arguments and fields, from the new columns (`pins` from `trips.places`) | anon + authenticated |

`save_reason` values: `create, save, publish, visibility, comments, delete` (0001's list plus `comments`; `unpublish` is unused because the MVP has no unpublish, only private).

### 4.4 Routes

| Route | Server/client | Loader | Metadata | Index | Sitemap |
|---|---|---|---|---|---|
| `/login?next&intent` (changed) | server page + client form | — | title per intent | noindex | no |
| `/auth/callback?next` (changed) | route handler | — | — | — | — |
| `/onboarding?next` (changed) | server | `getMyProfile` | — | noindex | no |
| `/quests/new` | client (Pick photos) | — | "Create a Quest" | noindex | no |
| `/quests/[key]/photos`, `/arrange`, `/review`, `/template`, `/preview`, `/share` | server shell + client step | `getQuestDraft` | "Create a Quest" | noindex | no |
| `/quests/[key]/view` | server | `getQuestDraft` (owner) → published document | Quest title | noindex | no |

All under `app/(app)/(create)/quests/`; `proxy.ts` matcher gains `/quests/:path*`, `/home`, `/explore`, `/notifications`, `/settings/:path*`, `/welcome`. `robots.ts` disallows `/quests/`. The WIP's `/new` and `/trips/*` routes are not ported.

## 5. Database and storage

Migrations (new files; the WIP's migration is kept with its exact name because the preview project already ran it):

1. `20261031000007_read_own_photo_files.sql`: **copied unchanged** from `editor-wip-ref` (reviewed as safe).
2. `20261110000008_profiles_keys.sql` (A-02): rename `profiles.id → key`; add `settings jsonb not null default '{}'`, `saved_at`, `saved_by`, `save_reason`; create `profiles_archive`, `handle_claims` (backfilled from current handles), `save_profile`, `is_handle_available`. Replace `own profile` (`for all`) with `select` only; revoke `insert, update, delete` on `profiles` from `authenticated`.
3. `20261110000009_trips_documents.sql` (A-03): rename `trips.id → key`, `owner_id → owner_key`, `cover_photo_id → cover_photo_key`; add `photos jsonb`, `places jsonb`, `comments_on`, `search_text`, `published_from text`, `saved_at`, `saved_by`, `save_reason`; backfill `photos`/`places` from the old tables (old rows' `taken_at` → `takenAt` and `date`); create `trip_drafts` (backfilled from `trips`), `trips_archive`, `trip_drafts_archive`, `removed_trip_urls`; drop `trips_touch_updated_at` and `touch_updated_at()`; replace `get_trip`, `get_profile`, `list_sitemap_trips`; create the save functions. Replace `for all` policies with `select` only on `trips`, `trip_drafts` and the archives (`owner_key = auth.uid()`); revoke `insert, update, delete` from `authenticated`. Revoke `update` everywhere from `service_role` too (admin code uses the functions). Indexes: `trips (owner_key, status, visibility, published_at desc)`, `trips using gin (search_text gin_trgm_ops)` (C uses it; `create extension if not exists pg_trgm`).
4. Later contract migration (not in the MVP): drop `photos`, `places` tables. They stay, unwritten, so a rollback of the database functions is possible during the friends test.

- **Foreign keys under archive-and-insert (important).** A save deletes the live row and inserts its successor under the same key in one transaction. A foreign key with `on delete cascade` pointing at that key would wipe the children (drafts, likes, comments) on every save, and a plain foreign key would refuse the delete. So every foreign key that points at a live table's `key` (`trip_drafts.key → trips.key`, `trips.owner_key → profiles.key`, and later B's and C's tables) is `on delete no action deferrable initially deferred`: the check runs at commit, when the key exists again. Only `profiles.key → auth.users.id` keeps `on delete cascade`. Real deletes (`delete_trip`, account deletion) remove children explicitly before the parent. Migration 9 re-creates the existing foreign keys this way; B and C follow the same rule and extend `delete_trip` and `delete_account_data` with their tables. A db test proves a save keeps the children and a delete removes them.
- **RLS:** every new table has RLS on. Owner `select` on live and archive tables. No insert/update/delete grants or policies: writes only via the functions. `handle_claims` and `removed_trip_urls`: no grants to `anon` or `authenticated`.
- **What each action archives:** draft autosave → `trip_drafts_archive`; publish, visibility, comments → `trips_archive`; profile save → `profiles_archive`; delete → nothing kept (hard delete of live + archive rows + files).
- **User delete:** `deleteQuest` removes `photos/{owner}/{key}/` and `exports/{owner}/{key}/`, then `delete_trip` removes live and archived rows of `trips` and `trip_drafts`. Account deletion (C-03) repeats this for every trip, then deletes the auth user (`profiles` and every table cascade on `owner_key`/`profile_key`).
- **Storage:** paths and variants unchanged: `photos/{userId}/{tripKey}/{photoId}/thumb.webp | display.webp`, `exports/{userId}/{tripKey}/{photoId}/export.jpg`. A replaced photo always gets a new id. No Supabase image transformations.
- **Database tests (`tests/db/`):** `profileSave.test.ts` (create, conflict on stale `saved_at`, archive row written, handle claimed by another user refused, no direct `update`/`insert` for `authenticated`); `tripSave.test.ts` (create, draft save + conflict, > 15 photos refused, publish copies draft and archives, visibility keeps slug, unlisted first publish has a suffix, draft never visible through `get_trip`, `takenAt`/`date` never in `get_trip` output); `tripDelete.test.ts` (live + archive rows gone, tombstone written, other users' rows untouched); `access.test.ts` updated for the renamed columns (existing cases keep passing).

## 6. Frontend

All app screens use `design-system/` only (decision 0002). New shared pieces the create flow needs go into `design-system/components/` (`Sheet`, `Toast` with an Undo action, `ProgressRing`, `Segmented`); a new colour or size is a design-system change first.

| Screen | Component (in `features/editor/`) | States |
|---|---|---|
| 3. Pick photos | `PickPhotos.tsx`, `PhotoTile.tsx` | empty grid; picking; per-photo progress; failed ("Retry", "Remove" after 3 tries); limit toast; Next disabled "Pick at least 3 photos"; offline banner "Waiting for a connection. Your photos are safe." |
| 4. Arranging | `Arranging.tsx` | one changing line ("Sorting by day…", "Finding places…", "Writing captions…"); fallback message then review; never a bare spinner |
| 5. Review pages | `ReviewPages.tsx`, `PageCard.tsx`, `PhotoSheet.tsx`, `MoveSheet.tsx`, `AddPhotos.tsx` | as screen 5; white dot on undated photos; "+ Add photos · 12 of 15"; Undo toasts; save status ("Saved", "Saving…", "Couldn't save. Retrying.") ; conflict dialog; "Choose 15" for old trips |
| 6. Choose a template | `ChooseTemplate.tsx` | two previews using the creator's cover |
| 7. Preview | `PreviewQuest.tsx` | full-screen `TripPage`; bottom bar "Back to edit" / "Publish" |
| 8. Publish + share | `PublishSheet.tsx`, `ShareScreen.tsx` | title prefilled; visibility with one-line help (Private adds "To remove photos completely, delete the Quest."); publishing; error; "Your Quest is live!" with Copy link (copied state), Share to WhatsApp (`https://wa.me/?text=`), Download for Instagram (→ B's export) |

State: Zustand store `features/editor/store.ts` (kept pattern from the WIP, rewritten for pages), with an undo stack of document snapshots (max 20). `useAutosave` (kept pattern): debounce 1.5 s, sends `basedOn`, stores the returned `savedAt`.

Upload resilience (A-10): the queue pauses on `offline` and resumes on `online`; processed blobs wait in IndexedDB (`features/editor/pendingUploads.ts`, keyed by trip key + photo id) until uploaded, so a reload or "Continue editing" resumes them. A photo counts as part of the Quest only once its row is in the draft document (added after its thumb and display finish).

Templates are untouched by this spec (B owns them); the preview uses `getTemplate(templateId).TripPage`.

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| Every new table: RLS on, owner-only, database test | Yes | §5; select-only owner policies; writes only via functions; tests listed |
| No anonymous `select` policy | Yes | None added. Public reads stay functions |
| No `UPDATE` (0001) | Yes | No update grants/policies/triggers; `touch_updated_at` trigger removed; actions only `.rpc()` |
| Never store photo GPS | Yes | GPS only in browser memory; rounded to 2 decimals before `nameLocations`; stored coordinates are the geocoder's town centre; files re-encoded without EXIF; test that worker output has no EXIF (kept from LLD §10) |
| `takenAt` owner-only | Yes | Lives in the document but `get_trip` builds photos with an explicit field list; db test asserts it |
| No user text in logs or analytics | Yes | `action()` logs error names only; analytics schemas forbid text fields; captions model input is dates + town names only |
| Secret key only in `lib/supabase/admin.ts` | Yes | Used only by account deletion (C) and the email sender (B). `ANTHROPIC_API_KEY`, `POSTHOG_KEY` server-only, read in `server-only` modules |
| `getUser()` on the server | Yes | `action()` already does; functions use `auth.uid()` |
| Open redirect | Yes (new) | `safeNext()` only allows same-origin relative paths |
| Unlisted URLs not leaked | Yes | Suffix kept; `Referrer-Policy` unchanged; PostHog proxy is first-party; analytics never sends the URL path of unlisted Quests (send `quest_id` = key) |
| Cost abuse of model/geocoder | Yes | Actions require sign-in and ownership of `key`; ≤ 5 points and ≤ 15 caption items per call; `writeCaptions` refuses when the draft already has `auto` captions for every eligible photo. Real rate limiting stays in `docs/03` "Later" (add when abuse shows up) |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content` | `DaySchema` gains optional fields | All optional; `titleSource` default in `toTripData()`; no limit narrowed (photoIds max 40, days max 30 stay; 15/5/3 enforced in the action and save function) | `toTripData.test.ts` with an old-shape fixture (no `titleSource`, 6 days, 20 photos on a day) |
| Drafts in progress | Only test trips; WIP never merged | Backfill puts each trip's current content into `trip_drafts` | migration test on seed data |
| Migrations | Column renames break the **old onboarding write** (`profiles.upsert({id})`) if code is rolled back after the migration | Read paths stay compatible (same `get_*` fields). Accepted because there are no real users; deploy migration and code together, preview project first (CTO decision C-A2) | `tests/db` run old `get_trip` expectations against the new schema |
| Archived rows | New | Parsed with the same schemas as live rows | `tripSave.test.ts` reads an archive row through `QuestDocumentSchema` |
| Public functions | `get_trip`, `get_profile`, `list_sitemap_trips` rewritten | Same arguments; every old field still returned (`id`, `updated_at`, `cover_photo_id` as aliases); fields only added | existing `access.test.ts` cases unchanged |
| Public URLs | Slug rule changes only for future publishes | Existing slugs untouched; handle changes redirect (C) | `publishSlug.test.ts` |
| Existing trip rendering | Beach becomes paged (B); `jitter` keys unchanged | Existing test trips are expected to change look (no real users; PRD replaces v1) | B's old-shape fixture renders without empty boxes |
| Storage | None | Paths, variants and buckets unchanged | — |
| Actions, tags, env, events | `trip:{id}` tag in HLD was never built; tags stay URL-based plus `trip-social:{key}`; new env `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_KEY`; event names change to the sheet's | `.env.example` updated; analytics schema test | `events.test.ts` |

**Deploy order:** migrations 7 → 8 → 9 and A's backend code in one release (code before migration would call missing functions; migration before code breaks onboarding). Preview project first, then prod. Prod is on 1–6; migration 7 runs there for the first time.

## 9. Performance and cost

- Upload: thumb (~40 KB) + display (~300 KB) first, export (~700 KB) last; 3 in parallel; one image decode at a time (phone memory).
- Arranging: < 10 s typical, 60 s budget. Model call capped at 8 s, geocoding at 5 s.
- Captions: ≈ $0.0005 per Quest (Haiku 5.5). 1,000 Quests ≈ $0.50.
- Geocoding: ≤ 5 reverse lookups + a few searches per Quest, free on Nominatim (C-A7), at most 1 request a second.
- Storage: ~17 MB per 15-photo Quest with `export.jpg`. 1,000 Quests ≈ 17 GB, inside Supabase Pro's 100 GB.
- PostHog: well inside the 1M events/month free tier for a friends test.

## 10. Analytics

Names and properties per the Taxonomy sheet (via `docs/analytics/` (client-events.csv, server-events.csv, common-properties.csv)). This spec fires: `app_opened`, `sign_in_started` (source: `app_open`, `comment`, `like`, `make_your_own`), `user_signed_in`, `user_signed_up` (server, with `referrer_quest_id` from the `ref` carried through sign-in), `username_set`, `quest_create_started`, `quest_draft_created` (server), `photos_picked`, `photo_limit_hit`, `photos_uploaded` (server), `quest_arranged` (`pages`, `seconds`, `captions_written`, `fallback_used`), `review_edit`, `template_selected`, `quest_previewed`, `quest_published` (server; `minutes_since_start` from `quest_create_started`), `quest_updated` (server, republish), `quest_link_shared` (`copy`, `whatsapp`), `quest_visibility_changed`, `quest_comments_toggled`, `quest_deleted` (server).

**Viewer → creator attribution (PRD question):** "Make your own Quest" links carry `?ref={tripKey}`; the login and onboarding steps carry it through; `user_signed_up` gets `referrer_quest_id`. Because `anon_id` survives sign-in and PostHog merges it with the user, "opened a shared Quest then published within 14 days" is a PostHog funnel on one person (`quest_viewed` with `is_owner=false` → `quest_published`). No database column needed.

## 11. Test plan

- **Unit (Vitest):** `arrange.test.ts` (every PRD M3/M4 case and every edge-case row: 3 photos, one day, mixed dated/undated, > 5 days, no data); `pageTitle.test.ts`; `pageEdits.test.ts` (move to space, swap on full page, remove blocked at 3, empty page disappears, new page only under 5, replace keeps slot, undo restores exactly, date change doesn't move); `publishSlug.test.ts` (rewritten rules); `lib/auth/next.test.ts`; `captions.test.ts` (prompt contains no user text, trims to 60, timeout → `[]`); `toTripData.test.ts` (old-shape + new fields); `uploadQueue.test.ts` (retries, offline pause, resume from pending store); `events.test.ts`; GPS-free worker output (kept from LLD).
- **Database (`tests/db/`):** listed in §5.
- **Backward compatibility:** old-shape `content` fixture; migration 9 on the seed's Goa trip produces the same `get_trip` output for every old field.
- **Playwright:** B-12's smoke test covers create → publish → view signed out → export one frame.
- **Human UX test (preview build):** PRD tasks 1, 2, 3.

## 12. Tasks

"Now" = can start today on sample data, before any dependency lands.

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| A-01 | Backend | Contract files | `lib/trip/limits.ts`, `lib/trip/schema.ts`, `lib/trip/types.ts`, `lib/trip/cards.ts`, `lib/profile/schema.ts`, `lib/trip/toTripData.ts` (+ test) | contract for all | — (**now**) | Schemas exactly as §4.1; old-shape fixture parses; `draftToTripData` added; CI green |
| A-02 | Backend | Profiles under 0001: migrations 7 (copied from WIP) and 8, `setHandle` through `save_profile` | `supabase/migrations/20261031000007_read_own_photo_files.sql`, `supabase/migrations/20261110000008_profiles_keys.sql`, `tests/db/profileSave.test.ts`, `tests/db/access.test.ts`, `tests/db/testDatabase.ts`, `features/account/actions.ts`, `features/account/getCurrentUser.ts`, `lib/handles.ts` (+ test), `lib/supabase/database.types.ts` | M1 (onboarding), 0001 | A-01 | `profileSave.test.ts` passes; no `.upsert` left in repo; reserved list extended; onboarding works locally |
| A-03 | Backend | Trips under 0001: migration 9 (documents, drafts, archives, save functions, rewritten `get_*`) | `supabase/migrations/20261110000009_trips_documents.sql`, `supabase/seed.sql`, `tests/db/tripSave.test.ts`, `tests/db/tripDelete.test.ts`, `tests/db/access.test.ts`, `features/trip-page/getTrip.ts` (schema field only), `lib/supabase/database.types.ts` | M2, M8, M16, 0001 | A-02 | All §5 trip db tests pass; old `access.test.ts` cases pass unchanged; `/@handle/slug` still renders the seed trip |
| A-04 | Backend | Quest write actions + loaders | `features/editor/actions.ts`, `features/editor/publishActions.ts`, `features/editor/publishSlug.ts` (+ test), `features/editor/refreshTrip.ts`, `features/editor/getQuestDraft.ts`, `features/editor/getMyQuests.ts`, `lib/storage.ts`, `lib/cacheTags.ts`, `lib/trip/countWords.ts`, `lib/supabase/browser.ts` | M8, M16, M28 (backend), edge cases | A-03 | Every action in §4.2 except arranging ones; conflict path tested; file sweep on publish; delete removes files then rows |
| A-05 | Backend | Arranging logic + places + captions | `features/editor/arrange.ts`, `features/editor/pageTitle.ts`, `features/editor/groupDays.ts` (tripDateKey only), `features/editor/suggestPlaces.ts`, `features/editor/arrangeActions.ts` (`nameLocations`, `searchPlaces`, `writeCaptions`), `lib/geo.ts`, `lib/captions.ts` (+ tests), `.env.example` | M3, M4 | A-01 (**pure parts now**) | `arrange.test.ts` covers every M3/M4/edge row (F-A1 rule pending, isolated in one function); captions mocked in tests |
| A-06 | Backend | Sign-in return paths | `lib/auth/next.ts` (+ test), `app/auth/callback/route.ts`, `app/(auth)/login/page.tsx` (params only), `app/(app)/onboarding/page.tsx` (redirect only), `features/account/LoginForm.tsx` (pass `next`), `proxy.ts` | M1, M10/M11 (return) | A-02 | `next` survives Google + onboarding; unsafe `next` → `/home` |
| A-07 | Backend | Analytics plumbing | `lib/analytics/events.ts`, `lib/analytics/client.ts`, `lib/analytics/server.ts`, `lib/analytics/anonId.ts` (+ tests), `next.config.ts` (`/ingest` rewrite only), `app/layout.tsx` (provider only), `docs/analytics/` (client-events.csv, server-events.csv, common-properties.csv) (provided by CTO) | analytics, attribution | CTO exports sheet | Typed `track()`/`trackServer()`; schema test; no PII fields possible |
| A-08 | Frontend | Create-flow design-system pieces | `design-system/components/Sheet.tsx`, `Toast.tsx`, `ProgressRing.tsx`, `Segmented.tsx` (+ any token change agreed with the founder) | M2, M5, M8 | — (**now**) | Components typed, tokens only, `noRawStyles` passes |
| A-09 | Frontend | Pick photos screen on sample data | `features/editor/PickPhotos.tsx`, `PhotoTile.tsx`, `app/(app)/(create)/quests/new/page.tsx`, `lib/demo/samplePhotos.ts` | M2 | A-08 (**now** with a fake uploader) | Limits, counter, copy and states as screen 3; tests for 16th photo and Next |
| A-10 | Frontend | Image worker + upload queue (port from WIP) | `features/editor/image.worker.ts`, `imageSize.ts`, `upload.ts`, `pendingUploads.ts` (+ tests), `package.json` (`exifr`, `zustand`, lazy `heic2any`) | M2, edge cases | — (**now**; real uploads need A-03) | Thumb/display first, export last; offline pause/resume; IndexedDB resume; HEIC fallback; GPS never leaves the page |
| A-11 | Frontend | Arranging + Review pages on sample data | `features/editor/Arranging.tsx`, `ReviewPages.tsx`, `PageCard.tsx`, `PhotoSheet.tsx`, `MoveSheet.tsx`, `AddPhotos.tsx`, `pageEdits.ts` (+ test), `store.ts`, `app/(app)/(create)/quests/[key]/{arrange,review}/page.tsx` | M3 (UI), M5 | A-08 (**now**; uses `arrange.ts` once A-05 lands, a stub before) | Every M5 check passes on sample data with Undo |
| A-12 | Frontend | Choose template, Preview, Publish sheet, Share screen | `features/editor/ChooseTemplate.tsx`, `PreviewQuest.tsx`, `PublishSheet.tsx`, `ShareScreen.tsx`, `app/(app)/(create)/quests/[key]/{template,preview,share,view}/page.tsx` | M6, M7, M8 | A-08, B-02 (**now** with Beach on sample data) | Screens 6–8 match copy; Mountain appears when B-04 lands |
| A-13 | Frontend | Wire the create flow to real data | `features/editor/*` (wiring only), `features/editor/useAutosave.ts`, `app/(app)/(create)/quests/[key]/photos/page.tsx` | M1–M8, M16 (edit), edge cases | A-04, A-05, A-06, A-09–A-12 | UX tasks 1–3 pass on the preview build; conflict dialog works across two tabs |
| A-14 | Frontend | Fire create-flow events | `features/editor/*`, `features/account/*` (track calls only) | analytics | A-07, A-13 | Every §10 event fires once with valid properties (schema test + manual PostHog check) |

## 13. Decisions

| Decision | Options considered | Choice | Reason | CTO sign-off? |
|---|---|---|---|---|
| Spec split | One spec; split by screen; split by data owner | Three specs by data owner (A writes, B views/reacts, C social) | Each reviewable and shippable alone | Yes |
| 0001 archive location | Archive tables; `archived_at` flag | Archive tables | Simple uniqueness and RLS | Yes (C-A1) |
| Trip document size | Per-table archiving; one document | One document (`content` + `photos` + `places` on the row) | Cheap saves at 15 photos | Yes (C-A1) |
| Drafts | Every autosave archives the published row; separate draft table | `trip_drafts` table | Edits go live on Publish; meaningful public history | Yes (C-A1) |
| `get_trip` field names | Rename `id` → `key` in output; keep both | Keep `id` and `updated_at` as aliases, add `key` and `saved_at` | CLAUDE.md: never remove returned fields | Yes (C-A3) |
| Slug after visibility changes | New suffixed URL on Public → Unlisted (docs/03); never change | Never change; suffix only on first unlisted publish | PRD M28 "its link still works" | Founder confirm (F-A4) |
| Removed photo files | Delete immediately; at next publish; at Quest delete only | At next publish (folder sweep) | Keeps Undo and draft history working; bounded exposure | Yes (C-A4) |
| Caption model | Haiku 5.5; GPT-5.4 nano/mini; Gemini Flash; templates | Haiku 5.5 | Cheapest, reliable JSON/length, ≈ $0.0005/Quest | Decided (C-A6) |
| Export variant | Keep `export.jpg`; drop it and export from display | Keep, uploaded last | Stories need > 1600 px for full-bleed landscape crops | No |
| What to keep from the editor WIP | — | Table in §16 | — | No |

## 14. Risks and open questions

### Decisions needed

**Founder**

- **F-A1. Arranging vs the M3 check.** A page holds 3 photos (review screen, prototype), so "12 photos over 3 days → 3 pages, one per day" can't happen. Recommended: keep 3 per page and change the check to "12 photos over 3 days → 4 pages in date order; a page holds one day whenever 5 pages allow". Alternative: let a page hold up to 5 photos (needs new template layouts).
- **F-A2. New users arriving from a like, comment or "Make your own".** Recommended: pick a username, then go straight back to the Quest (or Pick photos), skipping the welcome screens; "What's a Quest?" on Home explains the same thing later.
- **F-A3. Editing a published Quest.** Recommended: changes stay in the draft until you tap Publish again; leaving without publishing keeps them for next time. Confirm (UX task 3 implies it).
- **F-A4. Links.** Unlisted Quests get 6 random characters at the end of the link (onquest.in/@riya/goa-trip-k3f9x2) so they can't be guessed; changing who can see a Quest never changes its link. Confirm.
- **F-A5. Place points for the route page.** We keep the town's centre point from the map service (e.g. the centre of Panjim), never where the photo was taken. Confirm this fits "only the place name is kept".
- **F-A6. Replace photo.** Recommended: the new photo takes the slot and keeps the old caption; its own date and place win if it has them.
- **F-A7. Old test trips with more than 15 photos.** Confirm: they still play (in the new paged look), and editing asks to choose 15.
- **F-A8. "Email me a sign-in link" on the sign-in screen.** It needs Resend set up as the sign-in email sender (Supabase's built-in sender allows only a few emails an hour). Recommended: ship it, since Resend is set up for notifications anyway (spec B). The alternative is to hide the link until later and offer Google only.

**CTO**

- **C-A1.** Answers to 0001's open questions: archive tables; a trip is one document (photos and places jsonb on the row; the old tables are dropped later); a separate `trip_drafts` table so autosaves never archive the published row; keep all archive rows for the MVP.
- **C-A2.** Migrations 8–9 rename `id → key` and revoke update grants in one release. The old release's onboarding write breaks if code is rolled back; reads stay compatible. Accept (no real users), deploy migration + code together, preview first.
- **C-A3.** `get_trip` keeps returning `trip.id` and `trip.updated_at` as aliases of `key` and `saved_at` (compatibility, not a second id).
- **C-A4.** Removed or replaced photos' files are deleted at the next publish (or Quest delete), not at once.
- **C-A5.** Feature flag for rollout: recommended none in code. Friends test runs on production with no links posted publicly and the PRD's "v1 replaced" rule; add a sign-up allowlist only if strangers appear. (Founder to agree.)
- **C-A6. Decided 10 Nov (CTO):** captions by Claude Haiku 5.5 (`claude-haiku-5-5`) via the Anthropic API: $0.10 / $0.50 per million input/output tokens, so ≈ $0.0005 per Quest (≈ 1,500 tokens in, 600 out), 8 s cap. Cheaper than GPT-5.4 nano ($0.20 / $1.25) and mini ($0.75 / $4.50); captions use only date + town, so a text model is enough. New vendor for the privacy policy; new secret `ANTHROPIC_API_KEY`.
- **C-A7. Decided 10 Nov (CTO):** geocoder is OpenStreetMap Nominatim (free, no key). Stored names and centre points are OSM data under ODbL: show "© OpenStreetMap contributors" on the route page and map. Its usage policy allows at most 1 request a second and asks for caching and an identifying User-Agent: `lib/geo.ts` calls it server-side only, queues calls to 1/s, caches results by rounded coordinates, and sets `User-Agent: OnQuest (onquest.in)`. A Quest needs ≤ 5 reverse lookups. Fallback behind the same file: Geoapify free (3,000 requests/day) after checking its storage terms. Not Mapbox (storing needs paid permanent geocoding) or MapTiler free (non-commercial only). Builders confirm the current Nominatim usage policy before building A-05.
- **C-A8.** PostHog with a persistent `anon_id` (localStorage) and a first-party `/ingest` proxy replaces "cookieless mode" in `docs/03` §B.4; the privacy policy must say so. Export the Taxonomy sheet to `docs/analytics/` (client-events.csv, server-events.csv, common-properties.csv) so builders can use it.
- **C-A9. Decided 10 Nov (CTO):** stay on Vercel Hobby for the MVP and the friends test: nothing earns money yet. Move to Pro (≈ $20/month) when something earns money or if Vercel asks. Preview deployments now write to the Supabase preview project (the UX test creates Quests), replacing the read-only-preview rule in HLD §7.
- **C-A10.** CLAUDE.md needs a human edit after approval: public read functions list (B and C add some), the `trip-social:{key}` tag, new feature folders, `/quests/*` routes. Agents may not edit it.

### Technical risks

- iOS Safari memory with 15 large HEIC files: one decode at a time (kept); test on a 3-year-old iPhone.
- `heic2any` is ~1 MB; loaded only after a decode fails.
- `pg_trgm` in PGlite tests: check the extension loads (`@electric-sql/pglite/contrib/pg_trgm`); otherwise the trigram index is created only outside tests.

## 15. Later

Discard unpublished changes; "Unpublished changes" tag on cards; draft archive cleanup; contract migration dropping `photos`/`places` tables; private bucket + signed URLs for private Quests; resumable uploads across devices; more than 15 photos.

## 16. Editor WIP (`editor-wip-ref`): keep, change, drop

Builders copy kept files with `git show editor-wip-ref:<path>` into their task branch and adapt them; nothing is merged from that branch as is.

| WIP file | Verdict | Task |
|---|---|---|
| `supabase/migrations/20261031000007_read_own_photo_files.sql` | **Keep unchanged** (same filename; preview already has it) | A-02 |
| `features/editor/image.worker.ts`, `imageSize.ts` (+ test) | **Keep**: EXIF read, re-encode (no EXIF), Safari WebP→JPEG fallback. Change: lazy HEIC fallback | A-10 |
| `features/editor/upload.ts` | **Keep** the queue (3 parallel, 3 retries, one worker). Change: export last, offline pause, IndexedDB pending store, Retry/Remove | A-10 |
| `lib/storage.ts` (`uploadPhotoFiles`, `deletePhotoFiles`), `lib/supabase/browser.ts`, `lib/cacheTags.ts` (`profileTag`) | **Keep**; add folder listing for the sweep and avatar paths (C) | A-04 |
| `features/editor/groupDays.ts` | **Keep** `tripDateKey`, `groupPhotosIntoDays`, `tripDateRange`. **Drop** `addPhotosToDays` (open-ended days) | A-05 |
| `features/editor/suggestPlaces.ts`, `lib/geo.ts` | **Keep**; cap clusters at 5; town-level types; rounding before the call; Nominatim per C-A7 (1/s queue, cache, OSM credit) | A-05 |
| `features/editor/publishSlug.ts` (+ test) | **Change**: slug fixed at first publish; visibility never changes it | A-04 |
| `lib/trip/countWords.ts` | **Keep** | A-04 |
| `features/editor/refreshTrip.ts` | **Keep** `refreshTripPages`; **drop** `recountWordsAndRefresh` (`.update`) | A-04 |
| `features/editor/actions.ts`, `publishActions.ts` | **Drop** the bodies (`.update`, `.upsert`, `.delete`, 80-photo limit). Keep the input validation ideas (`IsoDate`, date refine) | A-04 |
| `features/editor/getEditorTrip.ts` | **Change** to read `trip_drafts` | A-04 |
| `features/editor/store.ts`, `useAutosave.ts` | **Keep the pattern** (Zustand context, debounce, save status); rewrite state for pages, `savedAt`, undo | A-11, A-13 |
| `features/editor/dayEdits.ts` (+ test) | **Drop** (merge/split days); replaced by `pageEdits.ts` | A-11 |
| `steps/PhotosStep.tsx`, `steps/PublishStep.tsx` | **Reference only** for Pick photos and Publish sheet; rebuild with the design system (they predate 0002) | A-09, A-12 |
| `steps/PlaceSearch.tsx` | **Reference** for the place field in the photo sheet | A-11 |
| `steps/DaysStep.tsx`, `PlacesStep.tsx`, `PlaceSuggestions.tsx`, `WordsStep.tsx`, `EditorView.tsx`, `NewTripForm.tsx`, `MyTripsView.tsx`, `fields.tsx`, `editorInitial.ts` | **Drop** (v1 open-ended editor) | — |
| `app/(app)/new`, `app/(app)/trips/*` | **Drop**; replaced by `/quests/*` | — |
| `lib/trip/schema.ts` change (`MAX_PHOTOS_PER_TRIP = 80`, day photoIds 80) | **Drop**; limits live in `lib/trip/limits.ts`, stored limits unchanged | A-01 |
| `package.json` (`exifr`, `zustand`) | **Keep** | A-10 |
| Small edits to `metadata.ts`, `HandleForm.tsx`, `auth/callback/route.ts`, `docs/02-lld.md` | Re-apply only if still needed in the owning task | A-06 |
