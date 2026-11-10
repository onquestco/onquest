# Spec C: Social layer: shell, welcome, Home and feed, Your Quests, Explore, guides, profiles, follow, settings (OnQuest MVP)

| | |
|---|---|
| PRD | `docs/prds/onquest-mvp.md` (approved by the founder on 2026-11-09; social layer re-approved the same evening with: likes need sign-in, team-only unique views, ranked feed, auto-follow later) |
| Status | Revised for plan review round 2 (10 Nov 2026). Changes are listed in §16 |
| Build mode | Backend + Frontend split. Every screen starts now on sample data; backend follows spec A's and B's migrations |
| Tracker IDs | C-01 … C-12 in `docs/specs/onquest-mvp-tasks.md` |
| Review | `docs/reviews/2026-11-10-plan-review-onquest-mvp.md` (round 1) |
| Depends on | Spec A (keys, `trips` document, `QuestCard`, `save_profile`, manage actions), spec B (likes and comments counts, notifications, email sender) |

## 1. Summary

Signed-in people move around OnQuest from a bottom bar (Home · Explore · Create · Quests · Profile). New users see three skippable welcome screens. Home leads with "Turn your last trip into a Quest", then their own Quests, then a ranked feed of Quests from people they follow plus suggestions. Explore searches Quests, people and the OnQuest team's travel guides. Profiles show public Quests, places, followers and following, with Follow. Settings cover profile editing, email switches, default visibility, showing places, sign out and account deletion. The ⋯ menu manages a published Quest.

Technically: one new record type (follows) under decision 0001; feed, suggestions, trending and search are Postgres functions over public Quests (trigram search, no external service); guides are Markdown files in the repo; handle changes keep old links through spec A's `handle_claims`; account deletion hard-deletes everything.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| M15: 2 public + 1 unlisted → profile shows the 2 public | `get_profile` (public only, unchanged rule) | existing `access.test.ts` + `profile.test.ts` |
| M18: Skip on the first welcome screen → Home with the banner | `/welcome` (C-02) | `Welcome.test.tsx` |
| M19: "What's a Quest?" → sheet with 3 steps, Create a Quest, See an example | `WhatIsAQuestSheet` (C-02) | `WhatIsAQuestSheet.test.tsx` |
| M20: Create in the bottom bar from Explore → Pick photos; bar hidden until leaving the flow | `BottomBar` + `CreateChooser`; `(create)` route group without the bar (C-01) | `BottomBar.test.tsx`; UX |
| M21: follow nobody → "Follow travellers to see their Quests here" + "Find people to follow" + suggestions | `HomeFeed` empty state, `list_suggested_quests` (C-04, C-08) | `HomeFeed.test.tsx` |
| M21: Neha's new public Quest appears under "From people you follow" above suggestions; a same-day Quest with more likes and comments sits above it | `list_feed` ranking by the founder's combined, time-decayed score (C-04, §3.4). "Same day" is read through that score: of two Quests published close together, the one with more likes and comments ranks higher | `tests/db/feed.test.ts` (same hour; and 10 hours apart with enough extra points) |
| M22: Follow → Following, count +1; tap again unfollows | `set_follow` (C-03), `setFollow` (C-05), `FollowButton` (C-09) | `tests/db/follows.test.ts`; UX |
| M22: Aman's 1 public + 1 unlisted → see only the public | `get_profile` | `profile.test.ts` |
| M23: type "goa" → Quests, People, Stories groups; no matches says so and suggests a place | `search_public` + guide search (C-04, C-06), `ExploreView` (C-11) | `tests/db/search.test.ts`, `searchGuides.test.ts` |
| M24: guide → scroll to end → linked Quests that open | `/guides/[slug]`, `list_quest_cards` (C-06, C-11) | `guides.test.ts`; UX |
| M25: username → riya_goa; profile and Quest links use it; old links still open | `saveProfile` + `handle_claims` + `resolve_handle` redirects; `profile-url:{handle}` tags refreshed for old and new handle (C-03, C-05) | `tests/db/handles.test.ts`; `redirect.test.ts` |
| M25: clear name → Save disabled with "Add your name so friends recognise you." | `EditProfileForm` (C-10) | `EditProfileForm.test.tsx` |
| M26: like-email switch off → bell yes, email no | `saveSettings` (C-05) + spec B's `notify.ts` | B's `notify.test.ts` |
| M26: Delete account → type DELETE → profile, Quests, photos, likes, comments, follows removed; signed out | `deleteAccount` + `delete_account_data`, then refresh of every affected cached page (C-03, C-05, §3.9) | `tests/db/accountDelete.test.ts` (rows gone; returns the keys to refresh); `deleteAccount.test.ts` (each tag refreshed); UX |
| M27: follow 2 → tap Following → both listed with Following that unfollows | `/@handle/following`, `list_follows` (C-03, C-09) | `follows.test.ts` |
| M28: ⋯ → Unlisted → leaves profile and search, link still works | `ManageQuestSheet` (C-07) → `setQuestVisibility` (A-04); slug unchanged | A's `tripSave.test.ts`; `search.test.ts` |
| M8 (search part): unlisted never in search | `search_public` filters `visibility = 'public'` | `search.test.ts` |
| Screen 20: Your Quests with All / Published / Drafts | `YourQuestsView` (C-07), `getMyQuests` (A-04) + `get_my_quest_counts` (C-03) | `YourQuestsView.test.tsx` |

## 3. Approach

### 3.1 App shell and routes

- `app/(app)/(tabs)/layout.tsx` renders the header (logo, `BellBadge` from spec B, avatar) and `BottomBar`: Home `/home`, Explore `/explore`, Create (raised orange button → `CreateChooser` sheet: "Create a Quest" → `/quests/new`; "Write a blog" tagged "Releasing soon" → "Blogs are releasing soon. For now, share your trip as a Quest."), Quests `/quests`, Profile `/@handle`.
- The create flow (`/quests/new`, `/quests/[key]/*`) lives in `app/(app)/(create)/` with no bar. The Quest page (`/@handle/slug`) has no bar.
- Public pages that signed-in people also use (`/@handle`, `/guides/[slug]`) show the bar only after the browser learns the visitor is signed in (cached HTML never reads cookies).
- Every `(app)` route requires sign-in (`/login?next=...`). `proxy.ts` also sends a visitor with a Supabase auth cookie from `/` to `/home` (cookie presence only, no network call, so the landing page stays fast; `/home` verifies with `getUser()`).

### 3.2 Welcome and Home banner

- After a first-time username pick with no `next` (spec A §3.8), onboarding goes to `/welcome`: three steps ("Your trip, as a scrapbook", "Pick photos. We do the rest.", "Share it. Friends react."), each a fan of three sample photos, dots and Skip; last step: "Create your first Quest" → `/quests/new`, "Look around first" → `/home`. Shown once because onboarding happens once; no extra state.
- Home banner: "Hi {first name}", "Turn your last trip into a Quest", "Pick 3 to 15 photos. We'll make the scrapbook in under a minute.", Create a Quest, What's a Quest? (sheet: 3 steps, Create a Quest, See an example → `EXAMPLE_QUEST_PATH` in `lib/site.ts`, `/demo` until the founders publish a real one).

### 3.3 Follows (decision 0001)

- `follows` live table: one row per `(follower_key, followee_key)`, `check (follower_key <> followee_key)`. Follow = insert; unfollow = archive (reason `delete`). `set_follow(p_target_key, p_follow)` is idempotent set-state like `set_like` (CTO decision C-B1).
- First-ever follow of that person → `follow` notification (bell) and, per F-B2, an email through spec B's `notify.ts` when `emailOnFollow` is on.
- Refreshes `profile:{followerKey}` and `profile:{followeeKey}` (both profiles' counts).

### 3.4 Feed ranking (decided by the founder, 9 Nov: likes, then comments, then how new, combined)

```
points = likes + 0.5 × comments + 1
score  = points / (hours_since_published + 6) ^ 1.2
```

- The founder decided the order: one combined score of likes, comments and recency (not a strict sort). Likes weigh more than comments (the founder's order); the `+1` lets a brand-new Quest with no reactions rank; the time decay means a new Quest isn't buried under an old popular one. With these constants a Quest published 10 hours earlier needs about 3× the points of a brand-new one to stay above it, a day-old one about 7×, a week-old one about 57×. (Round 1 used `(hours + 2)^1.5`, which needed ~15× at 10 hours: too harsh on popular same-day Quests.) Constants live in one SQL function (`quest_score`), so tuning is one migration; CTO confirms them (C-C1).
- PRD M21's "a same-day Quest with more likes and comments sits above it" is read through this score; `feed.test.ts` checks it for two Quests published in the same hour, and for Quests 10 hours apart where the older one has more than 3× the points.
- `list_feed(p_now, p_limit, p_offset)`: public published Quests from people I follow, by `quest_score(…, p_now)`. Pagination is offset-based with `p_now` fixed by the first page, so the order doesn't shift between pages except through new likes. 10 per page, "Load more".
- **Suggested for you** (`list_suggested_quests`): public Quests from people I don't follow (not mine), last 30 days by score, then all-time if fewer than 6.
- **Trending** (Explore, `list_trending_quests`): all public Quests, last 14 days by score.
- **Travellers to follow** (`list_travellers_to_follow`): people with at least one public Quest whom I don't follow, by total likes on their public Quests.
- **Place chips** (`list_place_chips`): the 8 most common town names across public Quests.
- Counts come from `count(*)` on live `likes`/`comments` with their `trip_key` indexes; there are no counter columns (counters would need updates). Fine to tens of thousands of Quests; past that, a nightly materialised score is the next step (Later).

### 3.5 Search

- In Postgres with `pg_trgm` (spec A creates the extension and the `trips.search_text` trigram index; `search_text` = title + destination + place names, built by `publish_trip`). People: trigram index on `lower(handle || ' ' || name || ' ' || home_city)`.
- `search_public(p_query, p_limit)`: query trimmed, 2–60 characters, lower-cased; Quests = public published with `search_text ilike '%q%'` or `similarity > 0.3`, ordered by similarity then score; People = profiles matching, ordered by similarity. Unlisted, private and draft Quests are never searched.
- Stories (guides) are searched in the app from the Markdown front matter (title, places, tags): they're a handful of files loaded once per server instance.
- Target: < 300 ms server time at p95 for 10k public Quests. The client waits for a 500 ms typing pause (the `search_performed` trigger), and keeps the last results while loading.
- Results: Quests (2 columns), People (rows with Follow), Stories (guide cards). No matches: "Nothing for "{q}"" and "Try a place, like Goa or Manali." Search text is never logged or tracked (only result counts).

### 3.6 Guides (PRD: where they live and how the team publishes)

- Markdown files in `content/guides/<slug>.md`, images in `public/guides/<slug>.jpg`. Front matter validated by zod at build time (`features/guides/guideSchema.ts`): `title`, `slug`, `summary`, `image`, `imageAlt`, `minutes`, `author` (always "the OnQuest team"), `publishedAt`, `places: string[]`, `tags: string[]`, `questKeys: uuid[]`.
- **Publishing = a pull request** adding the file and image; the CTO reviews and merges; Vercel deploys. No CMS, no admin screen, no database table.
- Body: paragraphs and `##` subheadings only, turned into React elements by a small parser (`features/guides/renderGuide.tsx`); no raw HTML, no `dangerouslySetInnerHTML`.
- `/guides/[slug]`: public, statically generated, indexable, in the sitemap, `Article` JSON-LD with `<` escaped. "Quests from this guide" calls `list_quest_cards(questKeys)`, which returns only Quests that are still public and published, cached with tag `guide-quests` and a 1-hour time limit.
- Who writes guides and how many at launch: founder decision F-C1.

### 3.7 Profiles

- `/@handle` stays a cached public page (tag `profile:{ownerKey}`). `get_profile` gains fields (never loses any): `profile.key`, `stats.followers`, `stats.following`, `places` (distinct town names from public Quests), and per Quest `key`, `photo_folder`, `page_count`, `photo_count`. When the owner turns "Show places on my profile" off, `places` and `pins` come back empty.
- Follow button state, "is this me" (Settings gear, bottom bar) come from `GET /api/profiles/[key]/me` (no-store), like spec B's Quest page.
- Followers / Following lists: `/@handle/followers` and `/@handle/following` (rewrites to `/u/[handle]/...`), signed-in only, dynamic, each row with Follow/Following (`list_follows` + `get_my_follow_state`).
- A Quest opened from someone's profile or the feed shows back and Follow next to the creator's name (spec B's `QuestByline` with `followingOwner`).
- **Old handles:** `/@old` and `/@old/slug` → `resolve_handle(old)` → 308 permanent redirect to the current handle. **Usernames are unique and never reused, even after account deletion** (CTO, 10 Nov): `handle_claims` rows are kept forever, `is_handle_available` refuses any handle ever claimed, and a deleted person's handle resolves to nothing (their Quest links show "This Quest was removed." from the tombstones), so no one can take over an old shared link.
- **Cache misses clear too.** `getProfile` is tagged `profile:{ownerKey}` **and** `profile-url:{handle}` (keyed by URL, like `tripUrlTag`, so a cached "no such profile" clears when someone takes that handle). `save_profile` callers refresh `profile-url:` for the old and new handle.

### 3.8 Edit profile and settings

- Edit profile (`/settings/profile`): Cancel / Save (enabled only after a change and when valid); photo (Change: pick an image, resized in spec A's worker to a 400 px `thumb.webp`, uploaded to `photos/{userId}/avatar/{photoId}/thumb.webp`, a new path pattern; the action receives only `avatarPhotoId` and builds the URL on the server with `lib/storage.ts`, so no outside URL can be set; Remove); Name (1–40, required: "Add your name so friends recognise you."); Username (spec A's handle rules, live availability with `checkHandle`, message "Your Quest links change to onquest.in/@… Old links keep working."); Home city (≤ 60, optional); Bio (≤ 150).
- On save with a new handle: refresh `profile:{key}`, `profile-url:{old}`, `profile-url:{new}` and, for every published slug, `trip-url:{old}/{slug}` and `trip-url:{new}/{slug}`, so cached pages under the old handle start redirecting.
- When the name, handle or photo changes, also refresh `trip-social:{key}` for every Quest the person has commented on (`list_my_comment_trip_keys()`), so their comments elsewhere show the new name and photo. Old avatar files are **kept** (paths never change) and removed only with the account, so cached comment lists never show a broken image.
- Settings (`/settings`): Account (Edit profile; Email from Google, read-only); Email me when (likes, comments, follows: switches, each saved at once); Privacy (New Quests start as Public / Unlisted / Private; Show places on my profile); Help (What's a Quest?, Send feedback = `mailto:` the support address, Privacy policy and terms links); Sign out (confirm); Delete account (type DELETE). Rapid switch taps are saved one after another with the latest `savedAt`, so they never conflict with themselves.

### 3.9 Account deletion (M26)

This is the only account-deletion design (spec A points here). `deleteAccount({ confirm: 'DELETE' })`, server, admin client:

1. Insert a `deleted_accounts` marker (insert-only: `key` = user key, `saved_at`, `saved_by`, `save_reason`), so an interrupted deletion can be finished later.
2. Delete every file under `photos/{userId}/` and `exports/{userId}/` (list and remove in batches; Quests, avatars, removed photos).
3. `delete_account_data(p_user_key) → jsonb` (service-role only, one transaction, explicit deletes, no cascades from data tables): insert tombstones for every published slug under every claimed handle; then delete, live and archived: the user's likes, comments and follows (both directions), likes and comments on their Quests, notifications to and from them, `notification_reads`, legacy `photos`/`places` rows, `trips`, `trip_drafts`, `profiles`. `handle_claims` and tombstones are **kept** (usernames are never reused). It **returns what to refresh**: `liked_or_commented_trip_keys` (other people's Quests the user liked or commented on), `follow_profile_keys` (everyone they followed or who followed them), `own_trips` (`{ key, slug }` of their published Quests), `handles` (every handle they claimed).
4. Delete the auth user (`auth.admin.deleteUser`), retried up to 3 times; a final failure goes to Sentry. If it still failed, `/auth/callback` sees the `deleted_accounts` marker on the next sign-in, finishes the deletion and signs the person out, so they never land in an empty onboarding.
5. Refresh caches: `trip-social:{k}` for each `liked_or_commented_trip_keys` (their comments and likes leave other people's pages), `profile:{k}` for each `follow_profile_keys` (follower counts), `profile:{me}`, `profile-url:{h}` and `trip-url:{h}/{slug}` for every handle × own slug, `trip-social:{key}` for own Quests, `explore`, `guide-quests`. Then sign out and land on `/` with "Your account was deleted."

If step 2 or 3 fails, nothing after it runs and the person can try again; the order never leaves data without its files being removable. The `deleted_accounts` marker holds only the user key (a random id) and is purged with the 180-day archives.

### 3.10 Your Quests and the ⋯ menu

- `/quests`: "Your Quests" + bell; a large "Create a Quest" card; All / Published / Drafts; 2-column grid of every Quest from `getMyQuests` (spec A) with like/comment counts from `get_my_quest_counts()`; Draft, Unlisted and Private tags; drafts say "Continue editing" (→ `/quests/[key]/review`); published cards have ⋯. Empty states per screen 20.
- `ManageQuestSheet` (⋯ on published cards, on Home's Your Quests and on your own Quest page): Edit Quest (→ review), Share link (native share or copy; sends no event until the taxonomy adds `quest_link_shared.source = quest_menu`, spec A §10), Download for Instagram (→ `/quests/[key]/export`), Who can see it (Public / Unlisted / Private → `setQuestVisibility`), Comments switch (→ `setQuestComments`), Delete Quest (confirm "Delete this Quest? This can't be undone." → `deleteQuest`). Each change uses the card's `savedAt`; on conflict the sheet reloads the card.

## 4. Contract

### 4.1 Data shapes (`lib/social/schema.ts`, added to spec B's file)

```ts
export const PersonSchema = z.object({
  key: z.uuid(), handle: z.string(), name: z.string(),
  avatarUrl: z.string().optional(), homeCity: z.string().optional(),
  following: z.boolean().optional(), // only when a signed-in viewer asked
});
export const FeedItemSchema = QuestCardSchema.extend({ likedByMe: z.boolean() });
export const FeedPageSchema = z.object({ items: z.array(FeedItemSchema), nextOffset: z.number().int().nullable(), now: z.string() });
export const ProfileViewSchema = z.object({
  key: z.uuid(), handle: z.string(), name: z.string(),
  bio: z.string().optional(), homeCity: z.string().optional(), avatarUrl: z.string().optional(),
  stats: z.object({ quests: z.number(), followers: z.number(), following: z.number(),
                    places: z.number(), countries: z.number(), days: z.number() }),
  places: z.array(z.string()),          // [] when the owner hides places
  quests: z.array(QuestCardSchema),     // public only
});
export const GuideCardSchema = z.object({ slug: z.string(), title: z.string(), summary: z.string(),
  image: z.string(), imageAlt: z.string(), minutes: z.number().int() });
export const SearchResultsSchema = z.object({
  quests: z.array(QuestCardSchema).max(10), people: z.array(PersonSchema).max(10), guides: z.array(GuideCardSchema).max(5),
});
```

`ProfileSettingsSchema` is spec A's (`lib/profile/schema.ts`).

### 4.2 Server actions and route handlers

| Action | Input (zod) | Result data | Errors (in data) | Cache tags |
|---|---|---|---|---|
| `setFollow` (`features/profile/actions.ts`) | `{ targetKey: uuid, follow: boolean, source: enum(profile, quest, explore, search, followers_list) }` (the taxonomy's `user_followed.source`; `auto` is unused until auto-follow ships) | `{ following, followerCount }` | `self`, `not_found` | `profile:{me}`, `profile:{target}` |
| `saveProfile` (`features/account/actions.ts`) | `{ basedOn, name: 1–40, handle: HandleSchema, bio: ≤ 150, homeCity: ≤ 60, avatarPhotoId: uuid \| null \| 'keep' }` (the URL is built on the server) | `{ saved: true, savedAt, handleChanged }` | `conflict`, `handle_taken`, `handle_reserved` | `profile:{me}`, `profile-url` old and new; if handle changed, `trip-url` for old and new handle × every published slug; if name/handle/photo changed, `trip-social` of Quests they commented on |
| `checkHandle` | `{ handle }` | `{ available }` | — | — |
| `saveSettings` | `{ basedOn, settings: ProfileSettingsSchema }` | `{ saved: true, savedAt }` | `conflict` | `profile:{me}` (when `showPlaces` changed) |
| `signOut` | `{}` | `null` | — | — |
| `deleteAccount` | `{ confirm: z.literal('DELETE') }` | `{ deleted: true }` | — | everything in §3.9 step 5 |

Name and bio limits (40, 150) are the editor's; the database checks stay 60 and 160 (never narrowed).

| Route handler | Method | Returns | Cache |
|---|---|---|---|
| `app/api/profiles/[key]/me/route.ts` | GET | `{ signedIn, isSelf, following }` | no-store |
| `app/api/search/route.ts` | GET `?q=` | `SearchResults` | no-store; signed-in only |
| `app/api/feed/route.ts` | GET `?offset=&now=` | `FeedPage` | no-store; signed-in only |

Loaders: `features/home/getHome.ts` (first feed page, suggestions), `features/explore/getExplore.ts` (chips, trending, guides, travellers; trending and chips cached 5 minutes, tag `explore`), `features/profile/getProfile.ts` (cached, tags `profile:{key}` and `profile-url:{handle}`), `features/profile/getFollows.ts`, `features/guides/guides.ts` (front matter + bodies, server-only), `features/account/getSettings.ts`.

### 4.3 Database functions (migration `20261110000011_social.sql`)

| Function | Args | Returns | Granted to |
|---|---|---|---|
| `set_follow` | `p_target_key uuid, p_follow boolean` | `{ following, follower_count }` | authenticated |
| `get_my_follow_state` | `p_keys uuid[]` (≤ 100) | `uuid[]` I follow | authenticated |
| `list_follows` | `p_profile_key uuid, p_kind text ('followers'\|'following'), p_limit int, p_offset int` | people | authenticated |
| `resolve_handle` | `p_handle text` | current handle of a live profile that ever claimed it, or null | anon, authenticated |
| `get_profile` (replaced) | unchanged `p_handle` | all old fields + `profile.key`, `stats.followers`, `stats.following`, `places`, per Quest `key`, `photo_folder`, `page_count`, `photo_count`; `pins`/`places` empty when hidden | anon, authenticated |
| `quest_card_json` | trips row | internal card builder (no grant) | — |
| `quest_score` | likes, comments, published_at, now | numeric (immutable) | internal |
| `list_feed` | `p_now timestamptz, p_limit int (≤ 20), p_offset int` | cards + `liked_by_me` | authenticated |
| `list_suggested_quests` | `p_limit int (≤ 10)` | cards | authenticated |
| `list_trending_quests` | `p_limit int (≤ 12)` | cards | anon, authenticated |
| `list_place_chips` | `p_limit int (≤ 12)` | text[] | anon, authenticated |
| `list_travellers_to_follow` | `p_limit int (≤ 10)` | people | authenticated |
| `search_public` | `p_query text, p_limit int (≤ 10)` | `{ quests, people }` | anon, authenticated |
| `list_quest_cards` | `p_keys uuid[]` (≤ 20) | cards, public published only, in the given order | anon, authenticated |
| `get_my_quest_counts` | — | `[{ key, like_count, comment_count }]` for my Quests | authenticated |
| `list_sitemap_profiles` | — | `{ handle, saved_at }` of profiles with ≥ 1 public Quest | anon, authenticated |
| `delete_account_data` | `p_user_key uuid` | `{ liked_or_commented_trip_keys, follow_profile_keys, own_trips, handles }` | service_role only |
| `list_my_comment_trip_keys` | — | `uuid[]` of Quests I commented on | authenticated |
| `save_profile_settings` | `p_based_on text, p_settings jsonb` | text (carries every other column, spec A §3.10) | authenticated |

### 4.4 Routes

| Route | Server/client | Loader | Metadata | Index | Sitemap |
|---|---|---|---|---|---|
| `/` (changed) | server | — | existing | index | yes |
| `/welcome` | client | — | "Welcome" | noindex | no |
| `/home` | server + client | `getHome`, `getMyQuests` | "Home" | noindex | no |
| `/quests` | server + client | `getMyQuests` | "Your Quests" | noindex | no |
| `/explore` | server + client | `getExplore` | "Explore" | noindex | no |
| `/guides/[slug]` | server, static | `guides.ts`, `list_quest_cards` | title, summary, image, `Article` JSON-LD | index | yes |
| `/@handle` (changed) | server, cached | `getProfile` | existing | index with ≥ 1 public Quest | yes (`list_sitemap_profiles`) |
| `/@handle/followers`, `/@handle/following` | server, dynamic | `getFollows` | "{name}'s followers" | noindex | no |
| `/settings`, `/settings/profile` | server + client | `getSettings` | "Settings" | noindex | no |

`next.config.ts` rewrites gain `/@:handle/followers` and `/@:handle/following` (before the `/@:handle/:slug` rule). Reserved handles (spec A) already include `home`, `explore`, `quests`, `guides`, `welcome`, `notifications`. `robots.ts` disallows the noindex app routes.

## 5. Database and storage

- Migration `20261110000011_social.sql` (C-03): `follows (key, follower_key, followee_key, saved_at, saved_by, save_reason, unique (follower_key, followee_key), check (follower_key <> followee_key))`, `follows_archive` (primary key `(key, saved_at)`, no other constraints, no foreign keys), `deleted_accounts`; indexes `follows (followee_key)`, `follows (follower_key)`; profile trigram index on `lower(concat_ws(' ', handle, name, home_city))` (so a missing city doesn't null it); the functions in §4.3; `delete_trip` is unchanged; `delete_account_data` is new.
- Foreign keys `follows_follower_key_fkey`, `follows_followee_key_fkey` → `profiles (key)`: `on delete no action deferrable initially deferred` (spec A §5 rule). `run_retention_cleanup` replaced to add `follows_archive` (90 days) and `deleted_accounts` (180 days).
- RLS: `follows` select own (either side is me); archive select own. No insert/update/delete grants.
- **What each action archives:** unfollow → `follows_archive`; profile edit and settings switch → `profiles_archive`; account deletion → nothing kept.
- **Database tests:** `follows.test.ts` (idempotent, self-follow refused, unfollow archives, counts, first follow notifies once); `feed.test.ts` (only followed + public; ranking checks from M21; pagination stable with fixed `p_now`); `search.test.ts` (public only, unlisted/private/draft never, people match handle/name/city, query length bounds); `handles.test.ts` (old handle resolves; another user can't claim it; **a deleted account's handles stay unavailable forever**); `profile.test.ts` (new fields; places hidden when switched off; old fields unchanged); `accountDelete.test.ts` (every table empty for that user, including archives and legacy rows; other users untouched; tombstones and claims kept; **returns the trip keys they liked or commented on and the profile keys on both sides of their follows**); `noUpdates.test.ts` extended to `follows`, `follows_archive`, `deleted_accounts`; `questCards.test.ts` (unlisted key in `list_quest_cards` returns nothing).
- **Storage:** new avatar path `photos/{userId}/avatar/{photoId}/thumb.webp` (inside the user's folder, so existing policies cover it); existing paths unchanged. Previous avatar files are kept until account deletion. Account deletion removes the whole user folder in both buckets.

## 6. Frontend

All app screens: `design-system/` only (decision 0002). New design-system components this spec needs: `BottomBar`, `TabButton`, `Avatar`, `Chip`, `Switch`, `CountTriplet`, `QuestCardView` (grid and feed variants), `EmptyState`, `ConfirmDialog`. Copy is the PRD's, quoted.

| Screen | Components (`features/...`) | States |
|---|---|---|
| Shell | `shell/BottomBar.tsx`, `shell/CreateChooser.tsx`, `shell/AppHeader.tsx` | active tab; bar hidden in create flow and Quest page |
| 10. Welcome | `account/Welcome.tsx` | 3 steps, dots, Skip on each; last step two buttons |
| 11. Home | `home/HomeBanner.tsx`, `home/WhatIsAQuestSheet.tsx`, `home/YourQuestsRow.tsx`, `home/HomeFeed.tsx` | empty Your Quests: "No Quests yet. Your next trip starts here."; feed empty: "Follow travellers to see their Quests here" + "Find people to follow" (→ Explore); loading skeleton cards; error with Retry |
| 12. Feed card | `home/FeedCard.tsx` | avatar, name, places, "2 days ago"; cover with title and "2 pages · 6 photos"; like (count), comments (count), share |
| 20. Your Quests | `quests/YourQuestsView.tsx`, `quests/ManageQuestSheet.tsx` | All / Published / Drafts; empty texts per screen 20; ⋯ actions with saving and error states; delete confirm |
| 13. Explore | `explore/ExploreView.tsx`, `explore/SearchBox.tsx`, `explore/SearchResults.tsx` | idle (chips, trending, guides, travellers); typing (keeps last results); results; no results copy |
| 14. Guide | `guides/GuideView.tsx` | image, "Guide · 4 min read · by the OnQuest team", paragraphs, "Quests from this guide" (hidden if none are public) |
| 15. Profile | `profile/ProfileView.tsx`, `profile/FollowButton.tsx` | own (gear, bottom bar) vs others (Follow/Following); no public Quests: "No public Quests yet." |
| 18. Followers / Following | `profile/FollowList.tsx` | empty: "No followers yet." / "Not following anyone yet." |
| 16. Edit profile | `account/EditProfileForm.tsx` | Save disabled until valid change; handle taken; saving; conflict reload |
| 17. Settings | `account/SettingsView.tsx`, `account/DeleteAccountDialog.tsx` | switches save at once (revert on error with a toast); sign-out confirm; DELETE typed exactly |

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| New tables: RLS, owner-only, db test | Yes | `follows`, `follows_archive` (§5) |
| No anonymous `select` policy | Yes | Public lists only via functions returning public Quests |
| No `UPDATE` (0001) | Yes | Follows set-state + archive; profile and settings via `save_profile` |
| Unlisted/private never discoverable | Yes | Every list and search function filters `status = 'published' and visibility = 'public'`; db tests per function |
| No user text in logs/analytics | Yes | `search_performed` sends counts only; `profile_updated` sends which fields changed, never values |
| Secret key only in `lib/supabase/admin.ts` | Yes | Used by `deleteAccount` and email |
| `dangerouslySetInnerHTML` | Yes | Guides parsed to React elements; JSON-LD escapes `<` |
| Account deletion is real (DPDP, 0001 rule 7) | Yes | §3.9, hard delete of live + archive rows + files + auth user |
| Places privacy | Yes | Only town names from public Quests; switch hides them |
| Enumerating users | Partly | Followers lists need sign-in; profiles are public by design (PRD) |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| `get_profile` | Rewritten | Same argument; every old field kept; fields only added | `profile.test.ts` asserts old fields |
| Profile URLs | Handle changes | 308 redirects from old handles forever; handles never reused | `redirect.test.ts` |
| Stored `profiles` | New `settings` jsonb | Parsed with defaults (`ProfileSettingsSchema`); `{}` = all defaults | unit test with `{}` and with a partial object |
| Storage | New avatar path pattern | Existing paths untouched | — |
| Rewrites | New followers/following rules | Placed before the `/:slug` rule; a Quest slug `followers` is refused by `slugify` (added to a reserved slug list) | `slug.test.ts` |
| Routes | `/` redirects signed-in visitors | Signed-out landing unchanged | Playwright |

**Deploy order:** migration 11 before C's backend code; additive, so the previous release keeps working.

## 9. Performance and cost

- Feed and search: one query each, indexed; no external search service, no new paid service.
- Explore lists cached 5 minutes; guide pages static.
- Avatars: ~30 KB each in the existing bucket.

## 10. Analytics

From `docs/analytics/*.csv` (they win):

| Event | Type | Fired by | Properties (per the CSVs) |
|---|---|---|---|
| `tab_tapped` | client | bottom bar | `tab`, `from_screen` |
| `create_menu_opened` | client | the Create tab | `from_screen` |
| `create_option_tapped` | client | chooser option | `option` (quest / blog), `available` |
| `quest_create_started` | client | each way into the flow | `source`: `home_banner` (banner), `home_empty` (Home empty state), `create_menu`, `quests_tab` (Create card), `quests_empty`, `ftue` (last welcome step), `whatis_sheet`; `make_your_own` is spec B's |
| `ftue_step_viewed` | client | each welcome step | `step` |
| `ftue_completed` | client | leaving the welcome screens | `action` (skip / create / look_around), `last_step` |
| `whatis_viewed` | client | the sheet opens | `source` (home_banner / settings) |
| `feed_viewed` | client | Home opens | `follows_count`, `items`, `suggested` |
| `quest_link_shared` | client | share on a feed card | `channel`, `source: feed`, `is_owner` |
| `quest_liked` | server | like on a feed card | `source: feed` (spec B's action) |
| `quests_tab_viewed` | client | Quests tab opens or filter changes | `filter`, `items` |
| `draft_resumed` | client | "Continue editing" | `quest_id`, `source` (home / quests_tab) |
| `user_followed` | server | `setFollow` | `target_user_id`, `source`, `unfollow` |
| `profile_viewed` | client | a profile opens | `profile_user_id`, `is_self`, `source` (tab / quest / feed / explore / search / followers_list) |
| `profile_link_shared` | client | share profile | `channel` (copy / native_share) |
| `followers_list_viewed` | client | a list opens | `profile_user_id`, `list` |
| `search_performed` | client | 500 ms pause or chip tap | `query_length`, `trigger`, `results_quests`, `results_people`, `results_stories` (never the text) |
| `search_result_tapped` | client | result tap | `kind`, `position` |
| `guide_opened` | client | a guide opens | `guide_id` (the slug), `source` (explore / search) |
| `guide_shared` | client | guide share | `guide_id`, `channel: native_share` |
| `username_set` | server | `saveProfile` with a new handle | `changed: true`, `length` |
| `profile_updated` | server | `saveProfile` with changes | `fields` (comma list of name, username, photo, city, bio; never values) |
| `settings_viewed` | client | Settings opens | — |
| `setting_changed` | server | `saveSettings` (not when re-tapping the current value) | `setting` (email_likes / email_comments / email_follows / default_visibility / show_places), `value` |
| `user_signed_out` | server | `signOut` | — |
| `account_delete_started` | client | Delete account tapped | — |
| `account_deleted` | server | `deleteAccount` | `quests_count` |

`quest_visibility_changed` (`source: quest_menu`), `quest_comments_toggled` and `quest_deleted` from the ⋯ menu are fired by spec A's actions. The ⋯ "Share link" sends nothing until the sheet adds `quest_menu` as a `quest_link_shared.source`.

## 11. Test plan

- **Unit:** `BottomBar.test.tsx` (hidden routes), `Welcome.test.tsx`, `WhatIsAQuestSheet.test.tsx`, `HomeFeed.test.tsx` (empty states), `YourQuestsView.test.tsx` (filters, tags), `EditProfileForm.test.tsx` (Save rules, messages), `guideSchema.test.ts` (every file in `content/guides` parses), `renderGuide.test.tsx` (no HTML passes through), `searchGuides.test.ts`, `redirect.test.ts`.
- **Database:** §5.
- **Backward compatibility:** `get_profile` old-field assertions; `settings = '{}'` parse.
- **Playwright:** covered by B-11's smoke test plus one step: Home shows the published Quest under Your Quests.
- **Human UX test:** the founder adds social tasks to the PRD's plan (follow someone, see their Quest on Home, search "goa", change username and open an old link, delete a test account). Not in the PRD's five tasks today; see F-C5.

## 12. Tasks

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| C-01 | Frontend | App shell: bottom bar, Create chooser, header, route groups | `design-system/components/{BottomBar,TabButton,Avatar}.tsx`, `features/shell/*`, `app/(app)/(tabs)/layout.tsx`, `app/(app)/(create)/layout.tsx` (no bar; spec A and B put their full-screen routes in this group), `proxy.ts` (`/` redirect; after A-06) | M20 | A-01, A-08, A-06 for `proxy.ts` | Bar on Home/Explore/Quests/Profile, hidden in create flow and Quest page |
| C-02 | Frontend | Welcome screens, Home banner, What's a Quest sheet | `features/account/Welcome.tsx`, `features/home/{HomeBanner,WhatIsAQuestSheet}.tsx`, `app/(app)/welcome/page.tsx`, `app/(app)/onboarding/page.tsx` (redirect to `/welcome`; after A-06), `lib/site.ts` (`EXAMPLE_QUEST_PATH`) | M18, M19 | C-01, A-06 for onboarding | M18 and M19 checks pass |
| C-03 | Backend | Migration 11: follows, profile extensions, handles, cards, counts, account data deletion | `supabase/migrations/…_11_social.sql` (follows, `deleted_accounts`, `save_profile_settings`, `list_my_comment_trip_keys`, `set_follow`, `get_my_follow_state`, `list_follows`, `resolve_handle`, `get_profile`, `quest_card_json`, `get_my_quest_counts`, `list_quest_cards`, `list_sitemap_profiles`, `delete_account_data`), `tests/db/{follows,handles,profile,accountDelete,questCards,noUpdates}.test.ts`, `lib/supabase/database.types.ts` | M15, M22, M25, M26, M27 | A-03, B-01 | §5 tests pass |
| C-04 | Backend | Feed, suggestions, trending, chips, travellers, search | `supabase/migrations/…_12_discovery.sql` (`quest_score`, `list_feed`, `list_suggested_quests`, `list_trending_quests`, `list_place_chips`, `list_travellers_to_follow`, `search_public`, profile trigram index), `tests/db/{feed,search}.test.ts`, `features/home/getHome.ts`, `features/explore/getExplore.ts`, `app/api/{feed,search}/route.ts`, `lib/social/schema.ts` (extends B-05's file) | M21, M23, M8 (search) | C-03, B-05 | M21 ranking checks pass in `feed.test.ts`; search p95 < 300 ms on 10k seeded Quests (local) |
| C-05 | Backend | Profile, settings, follow and account actions + handle redirects | `features/profile/{actions,getProfile,getFollows}.ts`, `features/account/{actions,getSettings}.ts`, `app/api/profiles/[key]/me/route.ts`, `features/trip-page/getTrip.ts` (redirect step, after B-05) + `features/profile/getProfile.ts` (redirect step), `app/auth/callback/route.ts` (finish an interrupted deletion), `lib/cacheTags.ts` (`profileUrlTag`), `lib/storage.ts` (avatar paths, folder delete), `lib/supabase/admin.ts`, `lib/slug.ts` (reserved slugs) (+ tests) | M22, M25, M26, M27 | C-03, B-05, B-06 (follow email) | Contract §4.2 exact; old-handle links 308; delete account leaves nothing and refreshes every §3.9 tag |
| C-06 | Backend | Guides content + sitemap | `content/guides/*.md` (2 placeholder guides marked DRAFT until the founder's land), `public/guides/*`, `features/guides/{guides,guideSchema,searchGuides}.ts` (+ tests), `app/sitemap.ts`, `app/robots.ts` | M23 (Stories), M24 | C-03 | Guides parse at build; sitemap lists public trips (≥ 80 words), profiles, guides |
| C-07 | Frontend | Your Quests tab + ⋯ Manage Quest sheet | `features/quests/{YourQuestsView,ManageQuestSheet}.tsx` (+ tests), `app/(app)/(tabs)/quests/page.tsx`, `design-system/components/{Switch,ConfirmDialog,EmptyState}.tsx` | M16, M28, screen 20 | A-01, C-01 (sample cards first); wiring after A-04, C-03 | Every ⋯ action works on the preview build; M28 check passes |
| C-08 | Frontend | Home: Your Quests row, feed, suggestions | `features/home/{YourQuestsRow,HomeFeed,FeedCard}.tsx` (+ tests), `app/(app)/(tabs)/home/page.tsx`, `design-system/components/QuestCardView.tsx`, `lib/demo/sampleSocial.ts` (extends B-03's file) | M19, M21 | A-01, C-01, B-03 (sample first); wiring after C-04, B-05 (feed likes) | M21 checks pass on the preview build |
| C-09 | Frontend | Profile page, Follow button, followers/following lists | `features/profile/{ProfileView,FollowButton,FollowList}.tsx` (+ tests), `app/(public)/u/[handle]/page.tsx`, `app/(app)/u/[handle]/{followers,following}/page.tsx`, `next.config.ts` (two rewrites; after A-07) | M15, M22, M27 | A-01, C-01, A-07 for `next.config.ts`; wiring after C-05 | M15, M22, M27 checks pass |
| C-10 | Frontend | Edit profile, Settings, sign out, delete account | `features/account/{EditProfileForm,SettingsView,DeleteAccountDialog}.tsx` (+ tests), `app/(app)/settings/page.tsx`, `app/(app)/settings/profile/page.tsx`, `features/editor/image.worker.ts` (avatar size option only; after A-10) | M25, M26 | A-01, C-01, A-10 for the worker; wiring after C-05 | M25, M26 checks pass |
| C-11 | Frontend | Explore, search, guide page | `features/explore/*`, `features/guides/GuideView.tsx`, `features/guides/renderGuide.tsx` (+ tests), `app/(app)/(tabs)/explore/page.tsx`, `app/(public)/guides/[slug]/page.tsx`, `design-system/components/Chip.tsx` | M23, M24 | A-01, C-01 (sample first); wiring after C-04, C-06 | M23, M24 checks pass |
| C-12 | Frontend | Social-layer events | `features/{shell,home,quests,explore,guides,profile,account}/*` (track calls only) | analytics | A-07, C-07 – C-11 | §10 events valid against the taxonomy schema |

## 13. Decisions

| Decision | Options considered | Choice | Reason | CTO sign-off? |
|---|---|---|---|---|
| Feed weighting | Strict sort (likes, then comments, then date); weighted score with time decay | Weighted score `(likes + 0.5 × comments + 1) / (hours + 6)^1.2` | Founder decided a combined score (9 Nov); constants are technical | Constants: yes (C-C1) |
| Feed pagination | Keyset; offset with fixed `now` | Offset + fixed `now` | Score changes with time; small lists | Yes (C-C1) |
| Search engine | Postgres trigram; full-text; external (Algolia, Typesense) | Postgres `pg_trgm` | Partial words and typos for short names; no new service | Yes (C-C2) |
| Guides storage | DB table + admin; CMS; Markdown in repo | Markdown in repo, published by PR | A handful of team-written guides; reviewed like code; free | Yes (C-C3) |
| Old handles | Release after a while; keep forever | Never reused, even after account deletion | No hijacking of old shared links | Decided (CTO, 10 Nov) |
| Counters | Counter columns; `count(*)` | `count(*)` with indexes | Counters need in-place updates (0001) | No |
| Follower lists | Public; signed-in | Signed-in | Less scraping; PRD flows are signed-in | Founder confirm (F-C3) |

## 14. Risks and open questions

### Decisions needed

**Founder**

- **F-C1. Guides.** The OnQuest team writes them (as the PRD assumes). Who writes the first ones, and how many at launch? Recommended: 3 to 5, each linking 2 to 4 public Quests, with images we own or license. They're added as Markdown files through a pull request.
- **F-C2. Explore for signed-out visitors.** Recommended: Explore, Home and Your Quests need sign-in; signed-out people still reach guides (`/guides/...`), profiles and Quests from links and search engines.
- **F-C3. Followers and Following lists need sign-in** (profiles and their counts stay public). Confirm.
- **F-C4. Deleting a draft.** The PRD gives drafts no ⋯ menu, so a draft can't be deleted. Recommended: give drafts a ⋯ with just "Delete draft".
- **F-C5. UX test for the social layer.** The PRD's five UX tasks don't cover follow, feed, search, username change or account deletion. Recommended: add two tasks (follow someone and see their new Quest on Home; change username and open an old link).
- **F-C6. Privacy policy and terms.** Settings links to them, and the processors list grows (Anthropic for captions, Resend for email, PostHog with a lasting device id). Who writes the update before the friends test?

**CTO**

- **C-C1.** Feed score constants `(likes + 0.5 × comments + 1) / (hours + 6)^1.2` (the combined order itself is the founder's, decided 9 Nov), offset pagination with a fixed `now`; same score for suggestions and trending.
- **C-C2.** Search in Postgres with `pg_trgm`; no external search service.
- **C-C3.** Guides as Markdown files in the repo, published by pull request; linked Quests by key.
- **C-C4. Decided 10 Nov (CTO):** usernames are unique and never reused, even after account deletion; `/@old/...` links of live accounts redirect forever, and a deleted account's links show "This Quest was removed."
- **C-C5.** Account deletion order: marker, files, one database function for all rows (live and archived, returning what to refresh), the auth user (retried; finished at next sign-in if it failed), then cache refreshes. Tombstones (a hash of handle/slug + the Quest key) and handle claims are kept forever, since usernames are never reused; the privacy policy says so (F-C6).
- **C-C6.** Signed-in visitors on `/` are sent to `/home` by `proxy.ts` on cookie presence only.

### Technical risks

- Offset pagination can show a Quest twice if it jumps in score between pages: dedupe by key on the client.
- Trigram search on very short queries (2 letters) is weak: show chips and travellers instead until 3 letters, but still search at 2.
- Many functions in one migration: C-03 and C-04 are split to stay reviewable.

## 15. Later

Auto-follow the person whose link brought a new user (PRD: later); a materialised feed score; private profiles, blocking, reporting; people writing guides; blogs; public Explore; follow suggestions from contacts; deleting a draft (F-C4).

## 16. Changes in round 2 (plan review, 10 Nov)

- Review tech 4 (blocking): `delete_account_data` returns the Quests and profiles to refresh; `deleteAccount` refreshes `trip-social`, `profile`, `profile-url`, `trip-url`, `explore`, `guide-quests` (§3.9); test added.
- Review tech 5 (blocking): §10 rebuilt from the CSVs. Changes: `setFollow.source` drops `feed`, adds `search`; `home_banner_tapped` removed (banner taps are `quest_create_started{home_banner}` / `whatis_viewed{home_banner}`); `feed_viewed` gains `suggested`; ⋯ "Share link" sends nothing until the sheet adds `quest_menu`; `setting_changed` uses the sheet's setting names; `quest_create_started` sources mapped per entry point.
- Founder item 6 / coordinator: feed order is the founder's decision; M21 read through the time-decayed score; constants changed to `(hours + 6)^1.2` and only the constants remain a CTO item.
- Founder item 7 / CTO: usernames never reused; `handles.test.ts` updated.
- Review 13: comments elsewhere refreshed on name/handle/photo change; old avatar files kept.
- Review 14: account deletion described only here.
- Review 15: `deleted_accounts` marker and retry.
- Review 16: `avatarPhotoId` instead of a URL.
- Review 20, 21: archive constraints; `noUpdates` tests.
- Review 22: `profile-url:{handle}` tag.
- Review 25: dependencies and shared-file order.
- Note 30: `concat_ws` in the trigram index.
