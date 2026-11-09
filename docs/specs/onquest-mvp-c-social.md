# Spec C: Social layer: shell, welcome, Home and feed, Your Quests, Explore, guides, profiles, follow, settings (OnQuest MVP)

| | |
|---|---|
| PRD | `docs/prds/onquest-mvp.md` (approved by the founder on 2026-11-09; social layer re-approved the same evening with: likes need sign-in, team-only unique views, ranked feed, auto-follow later) |
| Status | Draft, for Reviewer plan review then CTO approval |
| Build mode | Backend + Frontend split. Every screen starts now on sample data; backend follows spec A's and B's migrations |
| Tracker IDs | C-01 … C-12 in `docs/specs/onquest-mvp-tasks.md` |
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
| M21: Neha's new public Quest appears under "From people you follow" above suggestions; a same-day Quest with more likes and comments sits above it | `list_feed` ranking (C-04) | `tests/db/feed.test.ts` |
| M22: Follow → Following, count +1; tap again unfollows | `set_follow` (C-03), `setFollow` (C-05), `FollowButton` (C-09) | `tests/db/follows.test.ts`; UX |
| M22: Aman's 1 public + 1 unlisted → see only the public | `get_profile` | `profile.test.ts` |
| M23: type "goa" → Quests, People, Stories groups; no matches says so and suggests a place | `search_public` + guide search (C-04, C-06), `ExploreView` (C-11) | `tests/db/search.test.ts`, `searchGuides.test.ts` |
| M24: guide → scroll to end → linked Quests that open | `/guides/[slug]`, `list_quest_cards` (C-06, C-11) | `guides.test.ts`; UX |
| M25: username → riya_goa; profile and Quest links use it; old links still open | `saveProfile` + `handle_claims` + `resolve_handle` redirects (C-03, C-05) | `tests/db/handles.test.ts`; `redirect.test.ts` |
| M25: clear name → Save disabled with "Add your name so friends recognise you." | `EditProfileForm` (C-10) | `EditProfileForm.test.tsx` |
| M26: like-email switch off → bell yes, email no | `saveSettings` (C-05) + spec B's `notify.ts` | B's `notify.test.ts` |
| M26: Delete account → type DELETE → profile, Quests, photos, likes, comments, follows removed; signed out | `deleteAccount` + `delete_account_data` (C-03, C-05) | `tests/db/accountDelete.test.ts`; UX |
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

### 3.4 Feed ranking (PRD: likes, then comments, then how new, combined)

```
points = likes + 0.5 × comments + 1
score  = points / (hours_since_published + 2) ^ 1.5
```

- Likes weigh more than comments (the founder's order); the `+1` lets a brand-new Quest with no reactions rank; dividing by age with gravity 1.5 means a new Quest isn't buried under an old popular one (a one-day-old Quest needs ~6× the points of a fresh one to stay above it). Constants live in one SQL function (`quest_score`), so tuning is one migration.
- Same day, more likes and comments → higher (M21's second check).
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
- **Old handles:** `/@old` and `/@old/slug` → `resolve_handle(old)` → 308 permanent redirect to the current handle. Handles stay claimed by their owner forever (until account deletion), so nobody else can take an old link.

### 3.8 Edit profile and settings

- Edit profile (`/settings/profile`): Cancel / Save (enabled only after a change and when valid); photo (Change: pick an image, resized in spec A's worker to a 400 px `thumb.webp`, uploaded to `photos/{userId}/avatar/{photoId}/thumb.webp`, a new path pattern; Remove); Name (1–40, required: "Add your name so friends recognise you."); Username (spec A's handle rules, live availability with `checkHandle`, message "Your Quest links change to onquest.in/@… Old links keep working."); Home city (≤ 60, optional); Bio (≤ 150).
- On save with a new handle: refresh `profile:{key}` and, for every published slug, `trip-url:{old}/{slug}` and `trip-url:{new}/{slug}`, so cached pages under the old handle start redirecting.
- Settings (`/settings`): Account (Edit profile; Email from Google, read-only); Email me when (likes, comments, follows: switches, each saved at once); Privacy (New Quests start as Public / Unlisted / Private; Show places on my profile); Help (What's a Quest?, Send feedback = `mailto:` the support address, Privacy policy and terms links); Sign out (confirm); Delete account (type DELETE). Rapid switch taps are saved one after another with the latest `savedAt`, so they never conflict with themselves.

### 3.9 Account deletion (M26)

`deleteAccount({ confirm: 'DELETE' })`, server, admin client:

1. Delete every file under `photos/{userId}/` and `exports/{userId}/` (list and remove in batches; Quests, avatars, removed photos).
2. `delete_account_data(p_user_key)` (service-role only, one transaction): tombstones for every published slug under every claimed handle; then delete, live and archived: the user's likes, comments and follows (both directions), likes/comments on their Quests, notifications to and from them, `notification_reads`, `trips`, `trip_drafts`, `handle_claims`, `profiles`.
3. Delete the auth user (`auth.admin.deleteUser`).
4. Refresh `profile:{key}` and all `trip-url` tags; sign out; land on `/` with "Your account was deleted."

If step 1 or 2 fails, nothing after it runs and the person can try again; the order never leaves data without its files being removable.

### 3.10 Your Quests and the ⋯ menu

- `/quests`: "Your Quests" + bell; a large "Create a Quest" card; All / Published / Drafts; 2-column grid of every Quest from `getMyQuests` (spec A) with like/comment counts from `get_my_quest_counts()`; Draft, Unlisted and Private tags; drafts say "Continue editing" (→ `/quests/[key]/review`); published cards have ⋯. Empty states per screen 20.
- `ManageQuestSheet` (⋯ on published cards, on Home's Your Quests and on your own Quest page): Edit Quest (→ review), Share link (native share or copy), Download for Instagram (→ `/quests/[key]/export`), Who can see it (Public / Unlisted / Private → `setQuestVisibility`), Comments switch (→ `setQuestComments`), Delete Quest (confirm "Delete this Quest? This can't be undone." → `deleteQuest`). Each change uses the card's `savedAt`; on conflict the sheet reloads the card.

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
| `setFollow` (`features/profile/actions.ts`) | `{ targetKey: uuid, follow: boolean, source: enum(profile, quest, explore, feed, followers_list) }` | `{ following, followerCount }` | `self`, `not_found` | `profile:{me}`, `profile:{target}` |
| `saveProfile` (`features/account/actions.ts`) | `{ basedOn, name: 1–40, handle: HandleSchema, bio: ≤ 150, homeCity: ≤ 60, avatarUrl: string \| null }` | `{ saved: true, savedAt, handleChanged }` | `conflict`, `handle_taken`, `handle_reserved` | `profile:{me}`; if handle changed, `trip-url` for old and new handle × every published slug |
| `checkHandle` | `{ handle }` | `{ available }` | — | — |
| `saveSettings` | `{ basedOn, settings: ProfileSettingsSchema }` | `{ saved: true, savedAt }` | `conflict` | `profile:{me}` (when `showPlaces` changed) |
| `signOut` | `{}` | `null` | — | — |
| `deleteAccount` | `{ confirm: z.literal('DELETE') }` | `{ deleted: true }` | — | `profile:{me}`, all `trip-url` |

Name and bio limits (40, 150) are the editor's; the database checks stay 60 and 160 (never narrowed).

| Route handler | Method | Returns | Cache |
|---|---|---|---|
| `app/api/profiles/[key]/me/route.ts` | GET | `{ signedIn, isSelf, following }` | no-store |
| `app/api/search/route.ts` | GET `?q=` | `SearchResults` | no-store; signed-in only |
| `app/api/feed/route.ts` | GET `?offset=&now=` | `FeedPage` | no-store; signed-in only |

Loaders: `features/home/getHome.ts` (first feed page, suggestions), `features/explore/getExplore.ts` (chips, trending, guides, travellers; trending and chips cached 5 minutes, tag `explore`), `features/profile/getProfile.ts` (cached, tag `profile:{key}`), `features/profile/getFollows.ts`, `features/guides/guides.ts` (front matter + bodies, server-only), `features/account/getSettings.ts`.

### 4.3 Database functions (migration `20261110000011_social.sql`)

| Function | Args | Returns | Granted to |
|---|---|---|---|
| `set_follow` | `p_target_key uuid, p_follow boolean` | `{ following, follower_count }` | authenticated |
| `get_my_follow_state` | `p_keys uuid[]` (≤ 100) | `uuid[]` I follow | authenticated |
| `list_follows` | `p_profile_key uuid, p_kind text ('followers'\|'following'), p_limit int, p_offset int` | people | authenticated |
| `resolve_handle` | `p_handle text` | current handle or null | anon, authenticated |
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
| `delete_account_data` | `p_user_key uuid` | void | service_role only |

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

- Migration `20261110000011_social.sql` (C-03): `follows (key, follower_key, followee_key, saved_at, saved_by, save_reason, unique (follower_key, followee_key), check (follower_key <> followee_key))`, `follows_archive`; indexes `follows (followee_key)`, `follows (follower_key)`; profile trigram index; the functions in §4.3; `delete_trip` is unchanged; `delete_account_data` is new.
- Foreign keys to `profiles.key`: `on delete no action deferrable initially deferred` (spec A §5 rule).
- RLS: `follows` select own (either side is me); archive select own. No insert/update/delete grants.
- **What each action archives:** unfollow → `follows_archive`; profile edit and settings switch → `profiles_archive`; account deletion → nothing kept.
- **Database tests:** `follows.test.ts` (idempotent, self-follow refused, unfollow archives, counts, first follow notifies once); `feed.test.ts` (only followed + public; ranking checks from M21; pagination stable with fixed `p_now`); `search.test.ts` (public only, unlisted/private/draft never, people match handle/name/city, query length bounds); `handles.test.ts` (old handle resolves; another user can't claim it; deleted account frees it); `profile.test.ts` (new fields; places hidden when switched off; old fields unchanged); `accountDelete.test.ts` (every table empty for that user, including archives; other users untouched; tombstones written); `questCards.test.ts` (unlisted key in `list_quest_cards` returns nothing).
- **Storage:** new avatar path `photos/{userId}/avatar/{photoId}/thumb.webp` (inside the user's folder, so existing policies cover it); existing paths unchanged. The previous avatar file is deleted after a successful save. Account deletion removes the whole user folder in both buckets.

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
| Profile URLs | Handle changes | 308 redirects from old handles forever (until account deletion) | `redirect.test.ts` |
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

Per the Taxonomy sheet: `tab_tapped`, `create_menu_opened`, `create_option_tapped`, `ftue_step_viewed`, `ftue_completed`, `home_banner_tapped` / `whatis_viewed` (name per sheet), `feed_viewed` (`follows_count`, `items`), `quests_tab_viewed`, `draft_resumed`, `user_followed` (server; `source`, `unfollow`), `followers_list_viewed`, `profile_viewed`, `profile_link_shared`, `search_performed` (counts only), `search_result_tapped`, `guide_opened`, `guide_shared`, `profile_updated` (server; field names only), `settings_viewed`, `setting_changed` (server for saved settings), `username_set`, `user_signed_out` (server), `account_delete_started`, `account_deleted` (server; `quests_count`), `quest_visibility_changed`, `quest_comments_toggled`, `quest_deleted` (from the ⋯ menu; fired by spec A's actions).

## 11. Test plan

- **Unit:** `BottomBar.test.tsx` (hidden routes), `Welcome.test.tsx`, `WhatIsAQuestSheet.test.tsx`, `HomeFeed.test.tsx` (empty states), `YourQuestsView.test.tsx` (filters, tags), `EditProfileForm.test.tsx` (Save rules, messages), `guideSchema.test.ts` (every file in `content/guides` parses), `renderGuide.test.tsx` (no HTML passes through), `searchGuides.test.ts`, `redirect.test.ts`.
- **Database:** §5.
- **Backward compatibility:** `get_profile` old-field assertions; `settings = '{}'` parse.
- **Playwright:** covered by B-11's smoke test plus one step: Home shows the published Quest under Your Quests.
- **Human UX test:** the founder adds social tasks to the PRD's plan (follow someone, see their Quest on Home, search "goa", change username and open an old link, delete a test account). Not in the PRD's five tasks today; see F-C5.

## 12. Tasks

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| C-01 | Frontend | App shell: bottom bar, Create chooser, header, route groups | `design-system/components/{BottomBar,TabButton,Avatar}.tsx`, `features/shell/*`, `app/(app)/(tabs)/layout.tsx`, `app/(app)/(create)/layout.tsx` (no bar; spec A and B put their full-screen routes in this group), `proxy.ts` (`/` redirect) | M20 | A-08 (**now**) | Bar on Home/Explore/Quests/Profile, hidden in create flow and Quest page |
| C-02 | Frontend | Welcome screens, Home banner, What's a Quest sheet | `features/account/Welcome.tsx`, `features/home/{HomeBanner,WhatIsAQuestSheet}.tsx`, `app/(app)/welcome/page.tsx`, `app/(app)/onboarding/page.tsx` (redirect to `/welcome`), `lib/site.ts` (`EXAMPLE_QUEST_PATH`) | M18, M19 | C-01 (**now**) | M18 and M19 checks pass |
| C-03 | Backend | Migration 11: follows, profile extensions, handles, cards, counts, account data deletion | `supabase/migrations/20261110000011_social.sql` (follows, `set_follow`, `get_my_follow_state`, `list_follows`, `resolve_handle`, `get_profile`, `quest_card_json`, `get_my_quest_counts`, `list_quest_cards`, `list_sitemap_profiles`, `delete_account_data`), `tests/db/{follows,handles,profile,accountDelete,questCards}.test.ts`, `lib/supabase/database.types.ts` | M15, M22, M25, M26, M27 | A-03, B-01 | §5 tests pass |
| C-04 | Backend | Feed, suggestions, trending, chips, travellers, search | `supabase/migrations/20261110000012_discovery.sql` (`quest_score`, `list_feed`, `list_suggested_quests`, `list_trending_quests`, `list_place_chips`, `list_travellers_to_follow`, `search_public`, profile trigram index), `tests/db/{feed,search}.test.ts`, `features/home/getHome.ts`, `features/explore/getExplore.ts`, `app/api/{feed,search}/route.ts`, `lib/social/schema.ts` | M21, M23, M8 (search) | C-03 | M21 ranking checks pass in `feed.test.ts`; search p95 < 300 ms on 10k seeded Quests (local) |
| C-05 | Backend | Profile, settings, follow and account actions + handle redirects | `features/profile/{actions,getProfile,getFollows}.ts`, `features/account/{actions,getSettings}.ts`, `app/api/profiles/[key]/me/route.ts`, `features/trip-page/getTrip.ts` + `features/profile/getProfile.ts` (redirect step), `lib/storage.ts` (avatar paths, folder delete), `lib/supabase/admin.ts`, `lib/slug.ts` (reserved slugs) (+ tests) | M22, M25, M26, M27 | C-03, B-06 (follow email) | Contract §4.2 exact; old-handle links 308; delete account leaves nothing |
| C-06 | Backend | Guides content + sitemap | `content/guides/*.md` (2 placeholder guides marked DRAFT until the founder's land), `public/guides/*`, `features/guides/{guides,guideSchema,searchGuides}.ts` (+ tests), `app/sitemap.ts`, `app/robots.ts` | M23 (Stories), M24 | C-03 | Guides parse at build; sitemap lists public trips (≥ 80 words), profiles, guides |
| C-07 | Frontend | Your Quests tab + ⋯ Manage Quest sheet | `features/quests/{YourQuestsView,ManageQuestSheet}.tsx` (+ tests), `app/(app)/(tabs)/quests/page.tsx`, `design-system/components/{Switch,ConfirmDialog,EmptyState}.tsx` | M16, M28, screen 20 | C-01 (**now** on sample cards); wiring after A-04, C-03 | Every ⋯ action works on the preview build; M28 check passes |
| C-08 | Frontend | Home: Your Quests row, feed, suggestions | `features/home/{YourQuestsRow,HomeFeed,FeedCard}.tsx` (+ tests), `app/(app)/(tabs)/home/page.tsx`, `design-system/components/QuestCardView.tsx`, `lib/demo/sampleSocial.ts` | M19, M21 | C-01 (**now**); wiring after C-04, B-05 (feed likes) | M21 checks pass on the preview build |
| C-09 | Frontend | Profile page, Follow button, followers/following lists | `features/profile/{ProfileView,FollowButton,FollowList}.tsx` (+ tests), `app/(public)/u/[handle]/page.tsx`, `app/(app)/u/[handle]/{followers,following}/page.tsx`, `next.config.ts` (two rewrites) | M15, M22, M27 | C-01 (**now**); wiring after C-05 | M15, M22, M27 checks pass |
| C-10 | Frontend | Edit profile, Settings, sign out, delete account | `features/account/{EditProfileForm,SettingsView,DeleteAccountDialog}.tsx` (+ tests), `app/(app)/settings/page.tsx`, `app/(app)/settings/profile/page.tsx`, `features/editor/image.worker.ts` (avatar size option only) | M25, M26 | C-01 (**now**); wiring after C-05 | M25, M26 checks pass |
| C-11 | Frontend | Explore, search, guide page | `features/explore/*`, `features/guides/GuideView.tsx`, `features/guides/renderGuide.tsx` (+ tests), `app/(app)/(tabs)/explore/page.tsx`, `app/(public)/guides/[slug]/page.tsx`, `design-system/components/Chip.tsx` | M23, M24 | C-01 (**now**); wiring after C-04, C-06 | M23, M24 checks pass |
| C-12 | Frontend | Social-layer events | `features/{shell,home,quests,explore,guides,profile,account}/*` (track calls only) | analytics | A-07, C-07 – C-11 | §10 events valid against the taxonomy schema |

## 13. Decisions

| Decision | Options considered | Choice | Reason | CTO sign-off? |
|---|---|---|---|---|
| Feed weighting | Strict sort (likes, then comments, then date); weighted score with time decay | Weighted score, gravity 1.5, comments ×0.5 | PRD: "combined so a new Quest isn't buried" | Yes (C-C1) |
| Feed pagination | Keyset; offset with fixed `now` | Offset + fixed `now` | Score changes with time; small lists | Yes (C-C1) |
| Search engine | Postgres trigram; full-text; external (Algolia, Typesense) | Postgres `pg_trgm` | Partial words and typos for short names; no new service | Yes (C-C2) |
| Guides storage | DB table + admin; CMS; Markdown in repo | Markdown in repo, published by PR | A handful of team-written guides; reviewed like code; free | Yes (C-C3) |
| Old handles | Release after a while; keep forever per owner | Keep per owner until account deletion | "Old links keep working" with no hijacking | Yes (C-C4) |
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

- **C-C1.** Feed score `(likes + 0.5 × comments + 1) / (hours + 2)^1.5`, offset pagination with a fixed `now`; same score for suggestions and trending.
- **C-C2.** Search in Postgres with `pg_trgm`; no external search service.
- **C-C3.** Guides as Markdown files in the repo, published by pull request; linked Quests by key.
- **C-C4.** Old handles stay claimed by their owner until account deletion, so `/@old/...` links redirect forever and nobody else can take them.
- **C-C5.** Account deletion order: files, then one database function for all rows (live and archived), then the auth user; tombstones keep old Quest links saying "This Quest was removed." (only a hash of handle/slug is kept).
- **C-C6.** Signed-in visitors on `/` are sent to `/home` by `proxy.ts` on cookie presence only.

### Technical risks

- Offset pagination can show a Quest twice if it jumps in score between pages: dedupe by key on the client.
- Trigram search on very short queries (2 letters) is weak: show chips and travellers instead until 3 letters, but still search at 2.
- Many functions in one migration: C-03 and C-04 are split to stay reviewable.

## 15. Later

Auto-follow the person whose link brought a new user (PRD: later); a materialised feed score; private profiles, blocking, reporting; people writing guides; blogs; public Explore; follow suggestions from contacts; deleting archive rows for retention.
