# Spec: Blogs

| | |
|---|---|
| PRD | `docs/prds/blogs.md` (approved by the founder on 2026-11-23, QuestLog OQ-11; source: the Claude doc linked in its header) |
| Status | Revised for plan review round 2 (Tech Lead, 23 Nov 2026). CTO decisions signed off 23 Nov. Round 1 review: `docs/reviews/2026-11-23-blogs-plan-review.md`; changes listed in §17 |
| Build mode | Backend + Frontend split: 2 backend tasks, then 3 frontend tasks (5 PRs, batched for the Vercel deploy cap) |
| Tracker IDs | OQ-11 (feature row); task rows BL-01 to BL-05 to be added at `7. Ready to build` after approval |

**Readiness check: passes, with notes.** The PRD has a problem, a primary metric (blogs published), Must stories with testable ACs, edge cases (empty, offline, errors), out of scope, a UX test plan and a rollout. Four answers here contradict the PRD's current wording, so the PRD owner (Alok) must confirm them and the PRD text must change before the CTO approves (§14, questions 1, 2, 4 and 10): B5's "likes below 3" copy, the two-tab "later save wins", the B4 link format for unlisted blogs, and the unlisted linked Quest edge case. The design doesn't depend on which way they go, except question 10, which changes one condition in `get_blog_quest`.

**Context the PRD doesn't have, and how this spec handles it.**
- **Likes (21 Nov, founder):** the real count from the first like ("Like", "1 like", "2 likes"). Blogs reuse `likeLabel()` in `features/trip-page/likeCopy.ts`. B5's "Be the first to like this" is not built (founder question 1).
- **Email:** Resend isn't set up yet, so notifications go to the bell only. Blog likes and comments go through the same `notifyByEmail()` path as Quests. It returns `not_configured` today and starts sending once the `docs/runbooks/email.md` steps are done, with no further code (§3.6).
- **OQ-16 (merged 23 Nov, PR #19):** signed-out visitors get a view-only Home feed, and every action opens a sign-in popup. Signed-in routes live under `app/(app)/(signed-in)/`. Blog pages and cards never require sign-in to read. Like, comment, follow, "Write your own" and the card actions call `askToSignIn()` with the same `next` / `intent` / `ref` return the Quest page uses. `/blogs/*` links are added to `NEEDS_ACCOUNT` so they open the popup too (§6.4).
- **Deploy cap (Vercel, 300 a month):** 5 task PRs, each a coherent batch. Two migrations in total.

## 1. Summary

Writers get a one-screen composer (title, up to 10 photos, up to 10,000 characters of plain text, an optional place, an optional link to one of their own Quests). It autosaves as they type, works offline, and posts as Public, Unlisted or Private to `/@handle/blog/slug`. Readers get a fast, server-rendered, cached blog page with the linked Quest card, likes, comments and "Write your own". Blogs also appear on profiles (Quests · Blogs switch), the Quests tab, the Home feed (people you follow), Explore's Stories and search, and the bell.

Technically, blogs copy the Quest document model from decision 0001: a `blogs` live row plus a `blog_drafts` working copy. Both have archive tables, every write goes through one Postgres function, and every save checks `saved_at`. Blogs get their own like and comment tables, but share the notifications table, the photo storage paths and upload queue, the geocoder, the sign-in return and the email path with Quests. Writing is gated by a new `feature_access` table, so founders first, then friends-test users, with no deploy.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| B1 Create → "Write a blog" opens the composer, cursor in Title, no "Releasing soon" | `CreateChooser` (`blogsEnabled` prop from `has_feature_access('blogs')`), `/blogs/new` → `BlogComposer` (title `autoFocus`) | `CreateChooser.test.tsx` (flag on/off); Playwright `blogs.spec.ts` step 1 |
| B2 Title only → Post refused with "Add a title and some text or a photo." | `canPost()` in `features/blog-editor/postRules.ts`; `publish_blog` OQ422 `empty` as backstop | `postRules.test.ts`; `tests/db/blogSave.test.ts` (publish with empty body and no photos fails) |
| B2 120-char paste keeps 100, counter "100 / 100" | `TitleField` cuts to 100 code points on change; counter shows from 80 | `titleField.test.ts` (emoji and Devanagari counted as code points) |
| B3 11th photo refused, "A blog holds 10 photos." | `addPhotos()` in `features/blog-editor/photoRules.ts` (`BLOG_MAX_PHOTOS`); `save_blog_draft` OQ422 above 10 | `photoRules.test.ts`; `blogSave.test.ts` (11 photos fail) |
| B3 Drag third photo to front → cover in Preview and profile card | `PhotoRow` reorder sets `photos[0]`; `blog_card_json` cover = `photos->0` | `photoRules.test.ts` (reorder); `blogCards.test.ts` (cover = first photo) |
| B4 Link "3 days in Goa" → card in row, posted blog ends with it | `LinkQuestSheet` → `document.linkedQuestKey`; `publish_blog` keeps it only if it's the writer's published Quest; `get_blog_quest`; `LinkedQuestCard` | `blogSave.test.ts` (own published kept, someone else's dropped); `blogAccess.test.ts` (`get_blog_quest`) |
| B4 No published Quests → "You haven't published a Quest yet." + Create a Quest | `LinkQuestSheet` empty state (flushes the draft save before navigating) | `LinkQuestSheet.test.tsx` |
| B5 Close mid-text, reopen Quests tab → Blogs → draft with "Continue editing" and all text | Autosave (§3.2) + save on `visibilitychange`/`pagehide` + local backup; `list_my_blogs`; `YourBlogsList` | `blogDraftSaver.test.ts` (debounce, hide, offline, restore); `blogAccess.test.ts` (`list_my_blogs` lists drafts); Playwright step 2 |
| B6 Preview shows reader view with "Back to edit" and Post | Composer preview mode renders `BlogArticle` from the in-memory document | `BlogComposer.test.tsx` (preview toggle keeps unsaved text) |
| B7 Unlisted → signed-out friend sees it; not on profile, feed or search | `get_blog` returns public + unlisted; `get_profile.blogs`, `list_home_feed`, `list_explore_blogs`, `search_public.blogs` use public only | `blogAccess.test.ts`, `blogDiscovery.test.ts` |
| B7 Private → "This blog is private." and nothing else | `get_blog` returns null; `get_blog_status` → `private`; `BlogUnavailable` | `blogAccess.test.ts` (no content for anon/stranger, status word only) |
| B8 Signed-out reader on 4G sees title and text, no sign-in prompt | Cached server-rendered `/b/[handle]/[slug]` page; text in HTML; first photo eager, rest lazy | `metadata.test.ts`; Playwright step 3 (signed-out, throttled) |
| B9 View Quest opens Quest; Back returns to the same spot | `LinkedQuestCard` is a plain `<Link>`; App Router restores scroll; no scroll-jacking in the gallery | Playwright step 3 (scroll position within 50 px after Back) |
| B9 Linked Quest made private or deleted → card gone for others; writer sees "Your linked Quest isn't visible to readers" | `get_blog_quest` returns null for private/deleted; cache tag `blog-quests:{ownerKey}` refreshed by every Quest publish/visibility/delete; `get_my_blog_state.linked_quest_hidden` for the owner | `blogAccess.test.ts`; `refreshTrip.test.ts` (tag added) |
| Edge + privacy: linked Quest is unlisted | Proposed default (founder question 10): on a **public** blog, readers see the card only for a **public** Quest. An unlisted Quest's card shows to readers of an **unlisted** blog, and always to the owner, with "Your linked Quest isn't visible to readers" on a public blog | `blogAccess.test.ts` (public blog + unlisted Quest → null; unlisted blog + unlisted Quest → card; owner `/me` → card + hidden flag) |
| B10 Signed-out like → sign in → back on blog, like counted | OQ-16 popup (`askToSignIn()`) with `next=/@h/blog/s&intent=like&ref={blogKey}`; `readQuestIntent`/`intentStep` reused; `setBlogLike` source `after_sign_in` | `questIntent.test.ts` (unchanged, reused); Playwright step 4 |
| B11 Deleted blog → old link says "This blog was removed." | `delete_blog` writes `removed_blog_urls` under every handle; `get_blog_status` → `removed` | `blogDelete.test.ts` |
| B11 Comments off → comments hidden, "Comments are off for this blog." | `set_blog_comments`; `get_blog_social` returns `comments_on=false`, no comments, count 0 | `blogSocial.test.ts` |
| B12 Aman: 2 public + 1 unlisted → profile Blogs shows 2 | `get_profile.blogs` (public, published only); switch shown only when the list is non-empty (others' profiles) | `blogDiscovery.test.ts` |
| B13 Comment on my blog → bell within 1 minute with the blog's title | `post_blog_comment` inserts the notification in the same transaction; `list_my_notifications.blog`; `notificationText()` | `notifications.test.ts` (blog rows); `notificationText.test.ts` |
| S1 Place shows in search | `place` on the document → `search_text`; `searchBlogPlaces` action (geocoder) | `blogDiscovery.test.ts` (search by place name) |
| S2 Public blogs from people I follow in Home feed | `list_home_feed` | `feed.test.ts` (blog items, unlisted/private excluded) |
| S3 Public blogs in Explore Stories and search | `list_explore_blogs`; `search_public.blogs` | `blogDiscovery.test.ts` |
| Edge: text only, no photos | `BlogArticle`, `BlogRow`, `BlogFeedCard` render no gallery; `LetterTile` on profile/lists | `BlogArticle.test.tsx` (no gallery element); UX test 5 |
| Edge: links in text tappable, no previews | `BlogBody` turns `https?://` runs into `<a rel="nofollow ugc noopener">`, everything else text nodes | `blogBody.test.ts` |
| Edge: pasted formatting | `<textarea>` is plain text; body stored as-is | `blogBody.test.ts` (paragraphs and line breaks) |
| Edge: offline while writing | `blogDraftSaver` status `offline` → "Not saved yet. You're offline."; saves on `online`; upload queue pauses (existing) | `blogDraftSaver.test.ts` |
| Edge: photo fails 3 times → Retry and Remove; Post waits | Upload queue `MAX_ATTEMPTS = 3` (existing); `canPost()` false while any photo is pending | `postRules.test.ts`; `upload.test.ts` (unchanged) |
| Edge: two tabs | `save_blog_draft` OQ409 → "This draft was changed somewhere else. Reload." | `blogSave.test.ts` (stale `saved_at` fails); `blogDraftSaver.test.ts` |
| Edge: large/HEIC photos | `image.worker.ts` (existing re-encode, EXIF removed) | existing worker tests |
| Edge: same title twice → `blog-title-2` | `publish_blog` slug loop over the owner's blogs and their removed blog URLs | `blogSave.test.ts` |
| Safety: a blog key can't reuse a Quest key (shared storage folder) | `create_blog` raises OQ410 if the key is in `trips` or `trips_archive`; `create_trip` gets the reverse check (migration 16) | `blogSave.test.ts` (both directions) |
| Privacy: no exact location | Worker GPS dropped by the blog composer; place stores name/city/country/geoRef only, no lat/lng | `blogSchema.test.ts` (no coordinates in schema); `blogAccess.test.ts` (`get_blog` field list) |
| Privacy: account deletion removes blogs, drafts, photos, likes, comments | `delete_account_data` (replaced in migrations 16 and 17), `deleteUserFiles` (whole user folder, existing) | `accountDelete.test.ts` (blog rows) |

## 3. Approach

### 3.1 Data model (decision 0001)

A blog is one document, like a Quest (`supabase/migrations/20261110110000_09_trips_documents.sql`):

- `blogs` holds what readers see, one row per `key`. It is created as `status = 'draft'` by the first save and becomes `published` on Post.
- `blog_drafts` is the working copy, one row per `key`. Autosave archives only this table.
- `blogs_archive` and `blog_drafts_archive` hold the old rows. `removed_blog_urls` keeps tombstones for deleted blogs' links.

Editing a posted blog changes only the draft. Readers see the change when the writer taps Post again (the same as editing a published Quest), so half-typed sentences never go public and autosave never refreshes public caches.

The blog `key` is a uuid made in the browser when the composer opens. Uploads can therefore start before the row exists (the same as `create_trip`). The rows are created by the first save that has content, so closing an empty composer leaves nothing behind.

Blogs and Quests share the storage folder pattern `{userId}/{key}/`, so a blog key must never equal a Quest key. Otherwise deleting the blog, or the photo sweep after posting it, would delete the Quest's photos for good. `create_blog` raises OQ410 if the key is in `trips` or `trips_archive`, as well as `blogs` or `blogs_archive`. Migration 16 also replaces `create_trip` (same arguments) to reject a key already in `blogs` or `blogs_archive`. Random uuids never collide, so this only stops a reused or crafted key.

### 3.2 PRD question 1: autosave as you type, offline, and two tabs

**Saving.** `features/blog-editor/blogDraftSaver.ts` copies the Quest saver (`features/editor/draftSaver.ts`): one save at a time, each based on the `saved_at` the last one returned, so a tab never conflicts with itself.
- When: 2 s after the last change, and at least every 10 s while typing doesn't stop. Also straight away on `visibilitychange` to hidden and on `pagehide` (app closed or backgrounded). After a failure, it retries every 5 s.
- The first save calls `saveBlogDraft` with `basedOn: null`, which runs `create_blog` (both rows in one transaction). Later saves call `save_blog_draft`, which archives the draft row and inserts the new one.
- Status in the top bar: `saving`, then "Saved" (muted). Offline: "Not saved yet. You're offline." Conflict: the message below.

**Offline.** Every change is also written, at most every 500 ms, to `localStorage['oq_blog_draft:{key}']` as `{ basedOn, document, version }`. The entry is removed when a save of that version succeeds.
- While offline, typing never waits on the network. The saver stops trying until the `online` event, then saves.
- Photos keep using the existing upload queue, which pauses offline and resumes (`features/editor/upload.ts`, IndexedDB pending store keyed by the blog key).
- On load, the edit page compares the local entry with the server draft:
  - Same `basedOn` but a different document: unsaved work from this device. It is restored and saved at once.
  - Different `basedOn`: the server has a newer save from somewhere else. The local entry is dropped (the later save wins).
- A blog that never reached the server (offline from the first keystroke) is remembered under `localStorage['oq_blog_draft:new']` (its key). `/blogs/new` resumes it instead of starting another.
- Sign-out removes every `oq_blog_draft:*` entry (shared phones).
- Private mode can refuse storage. Autosave then still works, just without the local backup.

**Two tabs (decision 0001 rule 4).** Tab A and tab B open the draft at `saved_at = s1`.
1. A saves first and gets `s2`.
2. B's next save is based on `s1`, so `save_blog_draft` fails with OQ409.
3. B stops autosaving and shows "This draft was changed somewhere else. Reload." Reload loads `s2`.

Nothing that was saved is ever overwritten. The most recent successful save is what's kept, and the tab that is behind is told. B's unsaved text is lost when it reloads, as the PRD's "the later save wins" implies (founder question 2). Post from a stale tab fails the same way, because `publish_blog` checks the draft's `saved_at` too.

**Archive volume.** One archived draft row per save, about 10 KB at most. A 20-minute session is roughly 60 to 120 rows, around 1 MB. Blog draft archives are kept 30 days instead of the 180 for Quests (decision for the CTO, §13 D5).

### 3.3 PRD question 2: `/@handle/blog/slug` next to `/@handle/slug`

**How Quest URLs work today.** `next.config.ts` rewrites `/@:handle/:slug` to `/u/:handle/:slug`. A Quest's slug is `slugify(title, 70)`, or `unlistedSlug()` for unlisted, made once at first publish (`features/editor/publishSlug.ts`). It never changes after that. `RESERVED_SLUGS` already keeps `followers` and `following` free.

**Why blog links can't clash with Quest links.**
- A blog URL has three segments after the handle (`/@h/blog/s`). A Quest URL has exactly one (`/@h/s`), and `:slug` matches a single segment. So no Quest, including one whose slug is `blog`, can take over a blog URL, and the reverse can't happen either.
- The new rewrite `{ source: '/@:handle/blog/:slug', destination: '/b/:handle/:slug' }` goes next to the followers/following rewrites.
- Blog pages live in `app/(public)/b/[handle]/[slug]/`, not under `app/(public)/u/[handle]/blog/`. A static `blog` folder next to `[slug]` would make `/u/h/blog` stop resolving to a Quest whose slug is `blog`.
- `/b/...` is an internal path, like `/u/...` today. The canonical URL is always `/@h/blog/s`.

**Can an existing Quest already have slug `blog`?** Yes. `slugify('Blog')` is `blog`, and nothing reserves it. It keeps working unchanged (`/@h/blog` still goes to `[slug]`).

To keep `/@h/blog` free for a future "all blogs" page, `blog` is added to `RESERVED_SLUGS` in `lib/slug.ts`, so a new Quest titled "Blog" gets `blog-trip`. That only affects first publishes from the next release.

BL-01 includes a read-only check on production: `select count(*) from public.trips where slug = 'blog'`. If the count is not 0, those Quests simply keep their URL, and the future index page would need a different path. The result goes in the PR.

**Blog slugs.**
- Made at first publish: `firstPublishSlug(title, visibility)` with fallback `blog` instead of `trip` (titles in non-Latin scripts slugify to nothing). Unlisted blogs get the same random 6-character suffix as unlisted Quests (docs/03 §A.1; founder question 4).
- Unique per owner among live blogs and among removed blog URLs under every handle the owner has had. Duplicates get `-2`, `-3` (PRD edge case).
- The slug never changes after the first publish, whatever happens to the title or visibility.
- Old handles redirect (`resolve_handle`, the same as Quests): `/@old/blog/s` returns a 308 to `/@new/blog/s`.

**Handles.** `blog` and `blogs` are not added to the reserved handles. Profile URLs are under `/@`, so `/blogs/...` app routes can't clash, and `save_profile` rejects a reserved handle even for its current owner (migration 8). Reserving it would break profile saves for anyone who already has that handle.

### 3.4 PRD question 3: reusing Quest upload, likes, comments and notifications

| Piece | Reused as-is | Blog-specific |
|---|---|---|
| Image worker (`features/editor/image.worker.ts`) | Yes: re-encode, EXIF removed, HEIC handling | GPS returned by the worker is dropped straight away in the blog composer, never kept in state |
| Upload queue (`upload.ts`, `pendingUploads.ts`, `browserUploadDeps.ts`) | Yes, with `tripKey` = blog key | None |
| Storage paths (`lib/storage.ts`) | `photos/{userId}/{blogKey}/{photoId}/thumb.webp, display.webp` and `exports/.../export.jpg`. Same buckets, same folder policies (folder[1] = user id) | No new bucket or policy. `create_blog` and `create_trip` each reject the other's keys, so a blog and a Quest never share a folder (§3.1) |
| Photo sweep (`photoSweep.ts`) | Yes, after a publish: files in neither the live row nor the draft and older than 1 hour are deleted | Called from `publishBlog` |
| File delete (`deleteQuestFiles(folder)`) | Yes, for one blog's folder | Called from `deleteBlog` |
| Geocoder (`geocoderFor().searchPlaces`) | Yes, same limits | New action `searchBlogPlaces` (owner check on the blog) |
| Likes and comments | Same functions shape, rules and limits (300 characters, owner deletes). The limit is 5 comments a minute per person across Quests **and** blogs, counted both ways: `post_blog_comment` counts both tables, and migration 17 replaces `post_comment` (same arguments, same grant) to count `blog_comments` too | **Separate tables** `blog_likes`, `blog_comments` (+ archives) (§13 D1) |
| Notifications | **Same table**: new nullable `blog_key`, same kinds `like`/`comment` | `list_my_notifications` returns a `blog` object next to `quest` |
| Email (`lib/email/notify.ts`) | Same switches (`emailOnLike`, `emailOnComment`), budget, unsubscribe | `NotifyEvent.blogKey`, `NotifyDeps.blog()`, "your blog" wording |
| Social UI (`LikeButton`, `CommentList`, `CommentComposer`, `QuestSocialProvider`) | Yes | Provider gains `subject: 'quest' | 'blog'` (default `'quest'`), used for aria labels, copy and analytics |
| Sign-in return (`lib/auth/next.ts`, `questIntent.ts`) | Yes: `intent=like|comment`, `ref={blogKey}` | None |

**Why separate like/comment tables (D1).**
- `likes` and `comments` have `trip_key not null` with a foreign key to `trips` and `unique (trip_key, user_key)`.
- A shared "target type" design would make `trip_key` nullable on live tables, need partial unique indexes, and touch every function that counts likes: `quest_card_json`, `public_quests_scored`, `list_travellers_to_follow`, `delete_account_data` and others. It would also make the previous release's code risk reading rows it doesn't understand.
- Separate tables leave every Quest function and test unchanged. They are a straight copy, which is the "copy once" rule in CLAUDE.md.
- Notifications are the exception, because the bell is one stream: `blog_key` is added as a nullable column. Old code keeps working, since it inserts `trip_key` only and ignores the new field in results.

**RLS on the new tables** (CLAUDE.md security rules):
- RLS is on. Owner-only `select`: `blog_likes` by `user_key`, `blog_comments_archive` by `author_key`, `blogs`, `blog_drafts` and both archives by `owner_key`.
- `blog_comments` has no policy at all. Like `comments`, it is read only through `get_blog_social`.
- No insert, update or delete grants for client roles. No anonymous `select` policy anywhere.
- Every write is a `security definer` function granted per role (migration 11 pattern).
- `tests/db/noUpdates.test.ts` and `grants.test.ts` gain every new table and function.

### 3.5 PRD question 4: search and Explore indexing

- On publish, `blogs.search_text` is set to `lower(concat_ws(' ', title, place name, place city, body))`. It is indexed with a trigram GIN index where `pg_trgm` exists (the same guard as migration 9).
- `search_public` (replaced, same arguments) adds a `blogs` key with up to 10 public published blog cards.
  - Matches use `search_text ILIKE '%q%'`.
  - Results are ranked by trigram similarity on `lower(title || ' ' || place name)`, then by score. Similarity against 10,000 characters of body text is meaningless, so the body only decides whether a blog matches, not its rank.
  - `%` and `_` are escaped as today. Unlisted, private and draft blogs never match. The search text is never logged or tracked (existing rule).
- Explore: `list_explore_blogs(p_limit default 6)`. Public published blogs, the last 30 days first, then older, each by `quest_score(likes, comments, published_at)` (the founder's ranking from spec C §3.4, reused). Cached with the rest of public Explore under tag `explore`, 5 minutes.
- "Stories and guides" shows the guides as today, followed by blog rows "Blog · 4 min read · by @username" (founder question 6). Search groups `guides` and `blogs` under "Stories".
- Place chips (`list_place_chips`) stay Quest-only. Blog places don't add chips in this release (Later).

### 3.6 Notifications and email

- `set_blog_like` and `post_blog_comment` write the notification in the same transaction as the like or comment, so B13 ("within 1 minute") holds as soon as the bell polls.
- The rules are those of Quests: a like notifies only on that person's first like ever on that blog and names nobody. A comment notifies the writer unless they wrote it.
- `list_my_notifications` groups likes per blog per day, the same as per Quest.
- Bell text: "Someone liked {title}", "{n} people liked {title}", "{name} commented on {title}: "…"". Fallbacks are "your blog" and "{name} commented on your blog".
- Link: the blog path, plus `#comments` for comments.

**Email when Resend arrives.**
- `setBlogLike` and `postBlogComment` call `notifyBlogOwner()` (`lib/email/notifyServer.ts`) inside `after()`, the same as `notifyQuestOwner()`.
- `notifyByEmail()` reads the same switches and budget. Today it returns `not_configured` and sends nothing.
- When the CTO completes `docs/runbooks/email.md` (Resend key, domain, `EMAIL_LINK_SECRET`), blog emails start with no code change: subject "Someone liked your blog {title}" or "{name} commented on {title}", and the button "Open your blog".
- `email_send_log.kind` stays `like`/`comment`, so the daily budget is shared.

### 3.7 PRD question 5: SEO

| Page | Index | Why |
|---|---|---|
| Public blog, ≥ 80 words (title + body) | `index, follow` | docs/03 §C.1 rule for Quests |
| Public blog, < 80 words | `noindex, follow` | Thin pages |
| Unlisted blog | `noindex, nofollow` | docs/03 §C.1 |
| "This blog is private." / "This blog was removed." | `noindex` | docs/03 §C.1 |
| `/blogs/*` app routes (composer, owner view, share) | `noindex` + disallowed in `robots.ts` | App pages |
| Profile with no public Quest and no public blog | `noindex, follow` | A profile with public blogs isn't thin (D9) |

- **Metadata** (`features/blogs/metadata.ts`):
  - Title: `{title} by {name} | OnQuest`, trimmed to about 60 characters.
  - Description: the first 155 characters of the body with whitespace collapsed. Without a body: "A blog by @{handle}" (+ " · {place}").
  - Canonical: the absolute `/@handle/blog/slug`.
  - Open Graph `article` (published and modified time, author profile URL) and Twitter `summary_large_image`.
- **OG image** (`app/(public)/b/[handle]/[slug]/opengraph-image.tsx`): reuses `QuestPreviewImage` with the title, "{n} min read" and the handle.
  - The cover is drawn from the cover's export JPEG through `previewCoverUrl()`. That is why blog photos keep uploading `export.jpg` (D6).
  - No photos: a plain card. Private or removed: the plain card with the unavailable title, as for Quests. Under 300 KB.
- **JSON-LD** (`features/blogs/jsonLd.ts`):
  - `BlogPosting` with `headline`, `datePublished`, `dateModified`, `author` (Person + profile URL), `image` (cover display URL), `contentLocation` (Place name) and `wordCount`.
  - `BreadcrumbList` (Home → @handle → title). Serialized with `<` escaped.
- **Sitemap:** `list_sitemap_blogs()` returns `(handle, slug, saved_at)` for public published blogs with ≥ 80 words. `list_sitemap_profiles()` (replaced) also includes profiles with a public blog.
- **HTML:**
  - `<article>` with `<h1>` = title, author link to `/@handle`, `<time>` for the date.
  - Paragraphs in `<p>`, line breaks as `<br>`, links `rel="nofollow ugc noopener"`. All of it is server-rendered.
  - Photos: `alt` = "Photo {n} of {title}". Width and height always set. The first is eager, the rest lazy.

### 3.8 PRD question 6: `blog_read_end` the same way on every phone

Scroll percentages vary with screen height and font size, and `scroll` events behave differently on iOS Safari and Android Chrome (momentum scrolling, dynamic toolbars). So read-end is measured by **visibility of an end marker**, not by scroll position:

- `BlogArticle` renders an empty `<div data-read-end aria-hidden>` straight after the last paragraph of the body, before the Quest card and social block.
- `useReadEnd()` (`features/blogs/useReadEnd.ts`) watches it with one `IntersectionObserver` (threshold 0, no root margin; supported by every browser OnQuest supports). It counts **visible time** since `blog_viewed`, pausing while `document.visibilityState` is hidden.
- `blog_read_end` fires **once per page view**, the first moment both hold: the marker is in view, and visible time is ≥ 5 s.
  - The 5 s floor stops a short blog that fits on one screen from counting as "read" the instant it opens.
  - If the marker is already in view at 5 s, it fires then.
  - `seconds` = visible seconds, rounded.
- Bots are excluded by the existing `isBot()` in `lib/analytics/client.ts`. The beacon sender survives the page closing.
- Read through = `count(distinct page view with blog_read_end) / count(blog_viewed)` per `blog_id`. Blog to Quest = `count(distinct view_id on blog_quest_opened) / count(blog_viewed where has_quest)`. `blog_viewed`, `blog_read_end` and `blog_quest_opened` all carry the same `view_id` (a uuid made per page view), so both metrics join per view exactly.
- Playwright checks it at three viewports (iPhone SE 375×667, Pixel 7 412×915, desktop 1280×800). A short and a long blog must fire exactly once, only after the end is on screen and 5 s have passed.

### 3.9 Feature flag (rollout: founders first, then friends-test users)

- A new insert-only table, `feature_access`: `key`, `feature` (check `in ('blogs')`), `user_key` (null = everyone), `saved_at`, `saved_by`, `save_reason`. It has an archive table.
- Functions:
  - `has_feature_access(p_feature)` (authenticated): true if there is a row for `auth.uid()` or a row with `user_key is null`.
  - `grant_feature_access(p_feature, p_handle)` and `revoke_feature_access(p_feature, p_handle)` (service role / SQL editor only). Revoke archives the row (0001 rule 7).
  - Passing `p_handle => null` grants or revokes everyone.
- What the flag gates is **writing a new blog**, nothing else:
  - The Create chooser's "Write a blog" is active only with access. Everyone else keeps the "Releasing soon" placeholder and toast, as the PRD says.
  - `/blogs/new` is under `app/(app)/(signed-in)/`, so a signed-out visitor is sent to sign-in by that layout before `has_feature_access` (granted to `authenticated` only) is ever called. Signed in without access, it redirects to `/create`.
  - `/create` reads the flag only when there is a user. Signed out, it passes `blogsEnabled = false` and never calls `has_feature_access`.
  - `create_blog` raises OQ403 without access, so the database enforces it too.
  - Editing, managing and deleting your own blogs, and reading, liking and commenting on anyone's, are not gated. Only flagged people can create blogs, so everything else stays empty until they post (founder question 7).
- Rollout:
  1. `select public.grant_feature_access('blogs', '<founder handle>')` for each founder.
  2. Grant each friends-test user.
  3. Later, `grant_feature_access('blogs', null)` for everyone.
  
  None of these steps needs a deploy. The steps go in a new `docs/runbooks/feature-access.md` (BL-01).
- **Rollout rule: no production `grant_feature_access` until BL-05 is live in production.** Until then, BL-03 and BL-04 are tested on the Vercel preview against the Supabase preview project, with grants made there only. A production grant before BL-05 would put blog items in followers' feeds and bells before those screens render them. BL-02 makes them safe to ignore (§6.3), but not visible. The runbook opens with this rule, and the CTO makes the first production grant.
- `create_option_tapped` is defined in the taxonomy but not fired anywhere today. BL-03 adds it to `CreateChooser`: `{option: 'quest' | 'blog', available}`, with `available` = the flag's value for `blog` and always true for `quest`.

### 3.10 Flow overview

```
Create → "Write a blog" (flag) → /blogs/new ──first content──> saveBlogDraft(basedOn=null) → create_blog
                                    │                              → router.replace(/blogs/{key}/edit)
                                    ├─ type / photos / place / Link a Quest ──> autosave → save_blog_draft
                                    ├─ Preview (client mode) → Back to edit | Post
                                    └─ Post → flush save → [first post: PostSheet visibility] → publishBlog
                                              → publish_blog → refresh tags → /blogs/{key}/share ("Your blog is live!")
Reader: /@h/blog/s → rewrite /b/h/s → getBlog (cached) → BlogView
         ├─ getLinkedQuest (cached, tag blog-quests:{owner}) → "From this trip"
         ├─ getBlogSocial (cached, tag blog-social:{key}) → likes, comments
         └─ /api/blogs/{key}/me (no-store) → viewer: liked, owner, ⋯ menu, hidden-Quest note
```

## 4. Contract

### 4.1 Data shapes (new `lib/blog/schema.ts`, `lib/blog/cards.ts`, `lib/blog/limits.ts`)

Blog shapes get their own file under `lib/blog/`, as `lib/profile/schema.ts` does. `lib/trip/schema.ts` is untouched except for importing `VisibilitySchema`.

```ts
// lib/blog/limits.ts — product limits (founder, 23 Nov). Stored limits equal these; they may widen, never narrow.
export const BLOG_TITLE_MAX = 100;        // code points
export const BLOG_TITLE_COUNTER_FROM = 80;
export const BLOG_BODY_MAX = 10_000;      // code points
export const BLOG_MAX_PHOTOS = 10;
export const WORDS_PER_MINUTE = 200;      // "4 min read" = max(1, round(words / 200))
export const BLOG_MIN_WORDS_TO_INDEX = 80;

// lib/blog/schema.ts
export const BlogPhotoSchema = z.object({
  id: z.uuid(),                           // also the storage folder name
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
/** A place the writer chose (geocoder search). Never coordinates, never photo GPS. */
export const BlogPlaceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  city: z.string().max(100).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  geoRef: z.string().max(200).optional(), // Nominatim osm_type + osm_id
});
/** The editable document, as stored in blog_drafts and copied to blogs on publish. */
export const BlogDocumentSchema = z.object({
  title: z.string().max(BLOG_TITLE_MAX).optional(),       // not trimmed while typing; trimmed on publish
  body: z.string().max(BLOG_BODY_MAX).default(''),
  photos: z.array(BlogPhotoSchema).max(BLOG_MAX_PHOTOS).default([]), // [0] is the cover
  place: BlogPlaceSchema.optional(),
  linkedQuestKey: z.uuid().optional(),
  /** First content typed or photo picked, for minutes_since_start. Owner-only. */
  startedAt: z.iso.datetime({ offset: true }).optional(),
});
export type BlogDocument = z.infer<typeof BlogDocumentSchema>;

/** What get_blog returns (snake_case). Fields added later must be optional. */
export const BlogRowsSchema = z.object({
  blog: z.object({
    key: z.uuid(), slug: z.string(), visibility: z.enum(['public', 'unlisted']),
    title: z.string(), body: z.string(),
    photos: z.array(z.object({ id: z.uuid(), width: z.number(), height: z.number() })),
    place: z.object({ name: z.string() }).nullable(),
    comments_on: z.boolean(), word_count: z.number().int(),
    published_at: z.string(), saved_at: z.string(),
  }),
  owner: z.object({ key: z.uuid(), handle: z.string(), name: z.string().nullable(), avatar_url: z.string().nullable() }),
  photo_folder: z.string(),               // "{ownerKey}/{blogKey}"
});

/** What the blog page renders (built by toBlogData() in lib/blog/toBlogData.ts, the only place defaults apply). */
export type BlogData = {
  key: string; url: string; path: string; unlisted: boolean;
  title: string; paragraphs: string[][];  // paragraphs → lines (split on blank lines, then \n)
  photos: { id: string; width: number; height: number; display: string; thumb: string }[];
  placeName?: string; commentsOn: boolean; readMinutes: number; wordCount: number;
  publishedAt: string; updatedAt: string;
  writer: { key: string; handle: string; name: string; avatarUrl?: string; profileUrl: string };
};

// lib/blog/cards.ts — one card shape for profile, Quests tab, feed, Explore, search.
export const BlogCardSchema = z.object({
  key: z.uuid(),
  title: z.string(),                      // "Untitled blog" for an untitled draft (own lists only)
  status: z.enum(['draft', 'published']),
  visibility: VisibilitySchema,
  path: z.string().optional(),            // "/@riya/blog/goa-on-15k", published only
  excerpt: z.string().max(300),           // whitespace collapsed; cards clamp to 1 or 2 lines
  coverThumb: z.string().optional(),      // absent → LetterTile with title's first letter
  photoCount: z.number().int(),
  readMinutes: z.number().int().min(1),
  placeName: z.string().optional(),
  likeCount: z.number().int().default(0),
  commentCount: z.number().int().default(0),
  publishedAt: z.string().optional(),
  savedAt: z.string(),                    // live row's saved_at: the ⋯ menu's conflict token (opaque)
  commentsOn: z.boolean().optional(),     // own cards only
  draftSavedAt: z.string().optional(),    // own cards only
  owner: z.object({ key: z.uuid(), handle: z.string(), name: z.string(), avatarUrl: z.string().optional() }),
});
export type BlogCard = z.infer<typeof BlogCardSchema>;
```

Changes to existing shapes. All are additive: optional fields, or `.default()` for new arrays.

```ts
// lib/social/schema.ts
NotificationItemSchema: + blog: z.object({ key: z.uuid(), title: z.string(), path: z.string(), coverThumb: z.string().optional() }).optional()
FeedItemSchema stays the Quest item. New:
  export const HomeFeedItemSchema = z.discriminatedUnion('type', [
    FeedItemSchema.extend({ type: z.literal('quest') }),
    BlogCardSchema.extend({ type: z.literal('blog'), likedByMe: z.boolean() }),
  ]);
  FeedPageSchema.items → z.array(HomeFeedItemSchema)
  // Two users: getFeedPage (features/home/getHome.ts) builds it, and HomeFeed.tsx parses "Load more"
  // pages from /api/feed with it. BL-02 changes both: HomeFeed.tsx filters out type: 'blog' items
  // (renders Quest items exactly as today), so Home works on its own. BL-05 renders them (BlogFeedCard).
SearchResultsSchema: + blogs: z.array(BlogCardSchema).max(10).default([])
// lib/social/schema.ts ViewerStateSchema unchanged; blogs add:
export const BlogViewerSchema = ViewerStateSchema.extend({
  savedAt: z.string().optional(),          // owner only: conflict token for ⋯ actions
  visibility: VisibilitySchema.optional(), // owner only
  linkedQuestHidden: z.boolean().default(false),       // owner only: "Your linked Quest isn't visible to readers"
  ownLinkedQuest: QuestCardSchema.optional(),          // owner only: the private linked Quest's card
});
// features/trip-page/socialActions.ts
LikeSource unchanged; blogs use 'blog_page' | 'feed' | 'after_sign_in' (BlogLikeSource in features/blogs/socialActions.ts)
// lib/email/content.ts
NotificationEmail: + target?: 'quest' | 'blog' (default 'quest')
// lib/email/notify.ts
NotifyEvent: + blogKey?: string ; NotifyDeps: + blog: (blogKey) => Promise<{ title: string; url: string } | null>
// lib/slug.ts
RESERVED_SLUGS gains 'blog'; slugify(text, maxLength, fallback = 'trip')
// lib/cacheTags.ts
export const blogUrlTag = (handle: string, slug: string) => `blog-url:${handle}/${slug}`;
export const blogSocialTag = (blogKey: string) => `blog-social:${blogKey}`;
/** Linked-Quest cards on a person's blogs: refreshed by any of their Quest publishes, visibility changes and deletes. */
export const blogQuestsTag = (ownerKey: string) => `blog-quests:${ownerKey}`;
```

**`toBlogData()` defaults:**
- Paragraphs: split on one or more blank lines. Lines: split on `\n`. Empty lines are dropped.
- `readMinutes = max(1, round(word_count / 200))`.
- Writer `name` = name ?? handle.
- A missing `place` is left out of the result.

### 4.2 Server actions

`features/blogs/actions.ts` (writes on posted blogs and social) and `features/blog-editor/actions.ts` (draft). All are built with `action()`. Domain errors come back in `data`, never thrown (the Quest convention).

| Action | Input (zod) | Result data | Errors (`data.error`) | Cache tags refreshed |
|---|---|---|---|---|
| `saveBlogDraft` | `{ key: uuid, basedOn: string \| null, document: BlogDocumentSchema }` | `{ saved: true, savedAt, created: boolean }` | `conflict`, `not_found`, `too_many_photos`, `too_long`, `no_access` (create only), `exists` (key used) | None (draft only). Fires `blog_draft_saved` (server) at most once per calendar minute per blog. The action is stateless, so the rule is: fire on the create save (`basedOn` null), or when `date_trunc('minute', basedOn) ≠ date_trunc('minute', new savedAt)`, comparing the timestamps the database returned. A pure helper `shouldTrackDraftSave(basedOn, savedAt)` with a unit test |
| `discardBlogDraft` | `{ key }` | `{ discarded: true }` | `not_found`, `published` (refuses on a posted blog) | None. Deletes folder files + rows via `delete_blog` |
| `publishBlog` | `{ key, basedOnDraft, basedOnBlog, visibility: Visibility \| null }` (null = keep, only after first post) | `{ published: true, savedAt, slug, path, firstPublish }` | `conflict`, `not_found`, `empty`, `uploading` (client-side guard only), `invalid_visibility` | `blogUrlTag(h, slug)` for every handle, `profileTag(owner)`, `blogSocialTag(key)`, `blogQuestsTag(owner)`, `EXPLORE_TAG`. Then photo sweep in `after()` |
| `setBlogVisibility` | `{ key, basedOn, visibility }` | `{ saved: true, savedAt }` | `conflict`, `not_found`, `not_published` | Same as publish |
| `setBlogComments` | `{ key, basedOn, on: boolean }` | `{ saved: true, savedAt }` | `conflict`, `not_found` | `blogSocialTag(key)` |
| `deleteBlog` | `{ key }` | `{ deleted: true }` | `not_found` | Same as publish, at every handle and the slug |
| `searchBlogPlaces` | `{ key, text: string 2..60 }` | `{ found: true, places: GeoPlace[] }` | `not_found`, `rate_limited` | None |
| `setBlogLike` | `{ blogKey, liked, source: 'blog_page' \| 'feed' \| 'after_sign_in' }` | `{ saved: true, liked, likeCount }` | `not_visible` | `blogSocialTag(blogKey)`. Email in `after()` when `notified` |
| `postBlogComment` | `{ blogKey, body: string trim 1..300 }` | `{ posted: true, comment: Comment }` | `comments_off`, `not_visible`, `too_fast` | `blogSocialTag(blogKey)`. Email in `after()` |
| `deleteBlogComment` | `{ commentKey }` | `{ deleted: true }` | `not_owner`, `not_found` | `blogSocialTag(returned blog key)` |

Changes to existing actions and helpers:
- `refreshQuestPages()` (`features/editor/refreshTrip.ts`) also calls `updateTag(blogQuestsTag(ownerKey))`. This covers B9 for publish, visibility and delete.
- `refreshAfterProfileSave()` (`features/account/actions.ts`): when the name, handle or photo changed, it refreshes `blogUrlTag(handle, slug)` for every own published blog under the old and new handle, and `blogSocialTag` for every blog the person commented on (`list_my_comment_blog_keys`).
- `tagsToRefresh()` (`features/account/deletionTags.ts`): adds own blog URLs under every handle, `blogSocialTag` for own blogs and for blogs they reacted to, and `blogQuestsTag(userKey)`. The new fields come from `delete_account_data`. They are optional in `ResultSchema` (`.default([])`), so code and migration can deploy in either order.
- `signOut`: clears `oq_blog_draft:*` on the client (in `features/shell` sign-out handler) before the action.

Route handlers (never cached, `Cache-Control: private, no-store`):

| Route | Returns |
|---|---|
| `GET /api/blogs/[key]/me?owner=<profileKey>` | `BlogViewer` (from `get_my_blog_state` + `get_my_follow_state`) |
| `GET /api/unavailable-blog?handle&slug` | `{ ownerBlogKey: uuid \| null }`: only to the owner of a private blog (RLS read), for "Open your blog" |
| `GET /api/me/blogs` | `BlogCard[]` from `list_my_blogs` (own profile's Blogs tab) |

### 4.3 Database functions

Error codes as today: OQ401 not signed in, OQ403 not allowed (no access, comments off, not owner), OQ404 not found / not visible, OQ409 conflict, OQ410 key already used, OQ422 invalid, OQ429 too fast.

**Migration 16: blogs core**

| Function | Grant | Arguments → result | Notes |
|---|---|---|---|
| `has_feature_access` | authenticated | `(p_feature text) → boolean` | |
| `grant_feature_access`, `revoke_feature_access` | service_role | `(p_feature text, p_handle text) → void` | Handle null = everyone. Revoke archives |
| `create_blog` | authenticated | `(p_key uuid, p_document jsonb) → text saved_at` | Access check (OQ403). Key unused in `blogs`, `blogs_archive`, **`trips` and `trips_archive`** (OQ410: blogs and Quests share the `{uid}/{key}` storage folder, §3.1). Validates the document (OQ422). Inserts `blogs` (`status 'draft'`, `visibility` = profile `defaultVisibility` or `'public'`, `comments_on true`, `slug null`) and `blog_drafts`, both `save_reason 'create'` |
| `save_blog_draft` | authenticated | `(p_key uuid, p_based_on text, p_document jsonb) → text` | Lock, `saved_at` check (OQ409, `raise_missing` for vanished rows), archive + insert, `'save'` |
| `publish_blog` | authenticated | `(p_key, p_based_on_draft text, p_based_on_blog text, p_visibility text, p_slug text) → jsonb {saved_at, slug, first_publish}` | Checks both `saved_at`s. Title trimmed 1..100. Body trimmed non-empty or ≥ 1 photo (`empty`). ≤ 10 photos. Visibility required on first publish, null = keep later. Slug: pattern + ≤ 77 + loop `-2…` against own `blogs` and `removed_blog_urls` under every `handle_claims` handle. `linked_trip_key` kept only if it is the caller's `published` trip. `word_count` and `search_text` computed here. Archives `blogs`, inserts `'publish'`. Draft unchanged |
| `set_blog_visibility` | authenticated | `(p_key, p_based_on, p_visibility) → text` | Published only (OQ422). `'visibility'` |
| `set_blog_comments` | authenticated | `(p_key, p_based_on, p_on boolean) → text` | `'comments'` |
| `delete_blog` | authenticated | `(p_key) → jsonb {handles text[], slug text\|null}` | Hard delete (0001 rule 7). Tombstones if ever published. Then drafts archive, draft, blogs archive, blog. Migration 17 replaces it to delete child rows first |
| `get_blog` | anon, authenticated | `(p_handle text, p_slug text) → jsonb \| null` | Published, public or unlisted. Explicit field list (§4.1). Never returns `linked_trip_key`, `search_text`, `started_at`, `published_draft_saved_at`, `saved_by` or `save_reason`. It does return `saved_at` (as `dateModified`, the same as `get_trip`) and the owner's public profile key (as `get_profile` does) |
| `get_blog_status` | anon, authenticated | `(p_handle, p_slug) → 'private' \| 'removed' \| null` | The word only, never a key |
| `get_blog_quest` | anon, authenticated | `(p_blog_key uuid) → jsonb \| null` | `quest_card_json(t)` when the blog is published public/unlisted, its `linked_trip_key` is a published trip **of the same owner**, and the Quest's visibility allows it on this blog: a **public** blog shows only a **public** Quest, and an **unlisted** blog shows a public or unlisted Quest. This is the proposed default in founder question 10; if Alok keeps the PRD wording, it becomes "public or unlisted Quest on any public/unlisted blog". Private Quests: never (owner only, through `get_my_blog_state`) |
| `list_sitemap_blogs` | anon, authenticated | `() → table (handle, slug, saved_at)` | Public, ≥ 80 words |
| `blog_url_hash` | none (helper) | `(handle, slug) → text` | `sha256(lower(handle) || '/blog/' || lower(slug))` |
| `archive_blog`, `insert_blog`, `archive_blog_draft`, `blog_document_problem` | none (helpers) | | Same pattern as `archive_trip` / `insert_trip` |
| `delete_account_data`, `list_pending_deletions` | service_role (replaced) | Same arguments | Also delete blog rows, archives and blog tombstones (tombstones are **kept**, like Quest ones). Return `own_blogs: [{key, slug}]` in addition. **Must ship in migration 16**: the deferred `blogs.owner_key` FK would otherwise make account deletion fail |
| `run_retention_cleanup` | service_role (replaced) | Same | + `blog_drafts_archive` 30 days, `blogs_archive` 180 days, `feature_access_archive` 180 days |

**Migration 17: blog social and discovery**

| Function | Grant | Arguments → result | Notes |
|---|---|---|---|
| `can_see_blog` | none (helper) | `(p_blog_key, p_user_key) → boolean` | Published public/unlisted, or owner |
| `set_blog_like` | authenticated | `(p_blog_key uuid, p_liked boolean) → jsonb {liked, notified, like_count}` | Copy of `set_like` (advisory lock, first-like-ever notification) |
| `post_blog_comment` | authenticated | `(p_blog_key, p_body) → jsonb {key, saved_at}` | Copy of `post_comment`. Rate limit counts `comments` + `blog_comments` |
| `delete_blog_comment` | authenticated | `(p_comment_key) → uuid blog_key` | Blog owner only, archived |
| `get_blog_social` | anon, authenticated | `(p_blog_key) → jsonb` | Same shape as `get_trip_social` (`QuestSocialSchema` parses it) |
| `get_my_blog_state` | authenticated | `(p_blog_key) → jsonb {liked, is_owner, saved_at?, visibility?, comments_on?, linked_quest_hidden?, own_linked_quest?}` | Owner-only fields only when `is_owner` |
| `list_my_blogs` | authenticated | `() → jsonb BlogCard rows` | Own blogs, drafts included. Title, excerpt and cover from the draft. Status, path and counts from live. Newest `draft.saved_at` first |
| `list_my_comment_blog_keys` | authenticated | `() → uuid[]` | Profile-save refresh |
| `blog_card_json` | none (helper) | `(b blogs) → jsonb` | Card shape (§4.1, snake_case) |
| `list_home_feed` | authenticated | `(p_now timestamptz, p_limit int default 10, p_offset int default 0) → jsonb` | Quests **and** public blogs from people I follow, one list ordered by `quest_score`. Each item has `type` and `liked_by_me`. `list_feed` stays unchanged for the previous release |
| `list_explore_blogs` | anon, authenticated | `(p_limit int default 6) → jsonb` | §3.5 |
| `search_public` | anon, authenticated (replaced) | Same arguments | + `blogs` key |
| `get_profile` | anon, authenticated (replaced) | Same arguments | + `blogs`: public published blog cards, newest first. Every existing field unchanged (`getTrip.test.ts`-style field test) |
| `list_sitemap_profiles` | anon, authenticated (replaced) | Same | + profiles with a public blog |
| `list_my_notifications` | authenticated (replaced) | Same | + `blog` object. `comment_excerpt` also from `blog_comments`. Like grouping per `(trip_key, blog_key, day)` |
| `delete_blog`, `delete_account_data`, `list_pending_deletions`, `run_retention_cleanup` | (replaced) | Same | + blog likes, comments, archives and notifications. Account deletion also returns `liked_or_commented_blog_keys`. Retention: `blog_likes_archive`, `blog_comments_archive` 90 days |

### 4.4 Routes

| Route | Server/client | Loader | Metadata | Index / noindex | Sitemap |
|---|---|---|---|---|---|
| `/@handle/blog/slug` → `app/(public)/b/[handle]/[slug]/page.tsx` | Server page (cached after first visit, `generateStaticParams = () => []`), client islands for social, viewer, read-end, gallery | `getBlog`, `getBlogStatus`, `getLinkedQuest`, `getBlogSocial`, `getMovedHandle` | `blogMetadata()`, `unavailableBlogMetadata()` | §3.7 | `list_sitemap_blogs` |
| `app/(public)/b/[handle]/[slug]/opengraph-image.tsx` | Server | `getBlog`, `getBlogStatus`, `previewCoverUrl` | — | — | — |
| `/blogs/new?source=create\|write_your_own` | Server page (flag check, redirect `/create` without access) + client composer | `getMyQuestsForLinking` (published own Quests), `getMyProfile` (default visibility) | `noindex` | noindex, robots disallow `/blogs` | No |
| `/blogs/[key]/edit` | Server + client composer | `getBlogDraft(key)` (owner RLS read), `getMyQuestsForLinking` | `noindex` | noindex | No |
| `/blogs/[key]/share` | Server | `getBlogDraft(key)` (needs live slug + visibility) | `noindex` | noindex | No |
| `/blogs/[key]` (owner view of the posted blog, any visibility; drafts redirect to edit) | Server, never cached | `getOwnBlog(key)` (RLS), `getBlogSocial` | `noindex` | noindex | No |
| `/create` (existing) | Server reads `has_feature_access('blogs')` | — | — | — | — |
| `/quests` (existing, Quests tab) | Adds Blogs switch | + `getMyBlogs()` | — | — | — |

`next.config.ts`: add the rewrite (§3.3) before `/@:handle/:slug`. `proxy.ts` matcher: add `'/blogs/:path*'` and `'/create'`. `robots.ts`: disallow `/blogs` and `/b/` (the `/b/` path is internal; canonical is `/@…`).

## 5. Database and storage

**Migrations.** The numbers follow the latest (`20261123170844_15_open_home`, from OQ-16). If another migration lands first, the builder renumbers to keep the order.

1. `supabase/migrations/20261124100000_16_blogs.sql`
   - Tables (columns below).
   - RLS, grants and the default-privilege rules from migration 11.
   - The functions in §4.3 (migration 16 part).
   - Replaced `delete_account_data`, `list_pending_deletions` and `run_retention_cleanup`.
   - Trigram index guarded as in migration 9.
2. `supabase/migrations/20261124110000_17_blog_social.sql`
   - `blog_likes`, `blog_comments` and their archives.
   - `alter table notifications add column blog_key uuid` (deferred FK to `blogs`), plus `check (trip_key is null or blog_key is null)`.
   - Index `notifications_by_blog (blog_key)`.
   - The functions in §4.3 (migration 17 part).

**Tables (migration 16).** There are no column defaults on behaviour columns: save functions copy every value, and a forgotten one must fail.

```
blogs: key uuid pk, owner_key uuid not null (deferred FK profiles), slug text null, status text check (draft|published),
  visibility text check (public|unlisted|private), title text check (char_length <= 100), body text not null check (char_length <= 10000),
  photos jsonb not null (array, <= 10), place jsonb null, linked_trip_key uuid null (no FK: a deleted Quest just stops showing),
  comments_on boolean not null, search_text text not null, word_count int not null, published_at timestamptz,
  published_draft_saved_at timestamptz, started_at timestamptz, saved_at timestamptz not null, saved_by uuid,
  save_reason text not null check (create|publish|visibility|comments); unique (owner_key, slug)
blog_drafts: key uuid pk (deferred FK blogs), owner_key, title, body, photos, place, linked_trip_key, started_at,
  saved_at, saved_by, save_reason check (create|save)
blogs_archive, blog_drafts_archive: same columns + archived_at, pk (key, saved_at)
removed_blog_urls: url_hash text pk, blog_key uuid not null, saved_at, saved_by, save_reason check (= 'create')
feature_access: key uuid pk, feature text check (in ('blogs')), user_key uuid null, saved_at, saved_by, save_reason (= 'create'),
  unique nulls not distinct (feature, user_key)
feature_access_archive: same + archived_at
indexes: blogs_by_owner (owner_key, status, visibility, published_at desc), blogs_public (status, visibility, published_at desc),
  blogs_search_text gin trigram (guarded)
```

**No in-place updates (decision 0001).**

| Record | Key | Save function | Archived on | Conflict check |
|---|---|---|---|---|
| Blog draft | `blog_drafts.key` (= blog key) | `save_blog_draft` | Every autosave | `p_based_on` = draft `saved_at` |
| Blog (live) | `blogs.key` | `publish_blog`, `set_blog_visibility`, `set_blog_comments` | Publish / update (`publish`), visibility (`visibility`), comments (`comments`). There is no unpublish: Private is the way to hide | Live `saved_at` (publish checks the draft's too) |
| Blog like / comment | `blog_likes.key`, `blog_comments.key` | `set_blog_like`, `post_blog_comment`, `delete_blog_comment` | Unlike, comment delete | None (set-state, like Quests) |
| Notification | `notifications.key` | Inserted by the like/comment functions | Never (insert-only) | None |
| Feature access | `feature_access.key` | `grant_feature_access`, `revoke_feature_access` | Revoke | None (admin only) |
| Removed URL | `removed_blog_urls.url_hash` | `delete_blog`, `delete_account_data` | Never (kept, so links never get reused) | None |

**What a user's delete removes.**

`deleteBlog` runs in this order:
1. Storage files: `deleteQuestFiles(supabase, '{uid}/{key}')`, both buckets.
2. `delete_blog`:
   - Writes tombstones for every handle if the blog was ever published.
   - Deletes notifications for the blog, `blog_likes` and their archive, `blog_comments` and their archive, `blog_drafts_archive`, `blog_drafts`, `blogs_archive`, `blogs`. All in one transaction.
3. Tags refreshed.

Files go first, so a failure leaves rows that can be deleted again, never rows pointing at missing files (the `deleteQuest` order).

Account deletion: `deleteUserFiles` already removes everything under `{uid}/`, so blog folders are covered. `delete_account_data` removes every blog row and archive, and the person's blog likes and comments on anyone's blogs.

**Tables touched that still update in place.** None: blogs touch only tables already on the 0001 model. `notifications` gains a column through `alter table`, a schema change rather than a row update.

**RLS policies.**
- `blogs`, `blog_drafts`, `blogs_archive`, `blog_drafts_archive`: `select` for authenticated where `owner_key = auth.uid()`.
- `blog_likes`, `blog_likes_archive`: `select` where `user_key = auth.uid()`.
- `blog_comments_archive`: `select` where `author_key = auth.uid()`. `blog_comments`: none (service role select only, as `comments`).
- `removed_blog_urls`, `feature_access`, `feature_access_archive`: no policies, no client grants.
- Grants: `select` to authenticated and service_role on the readable tables. Nothing else.

**Database tests** (`tests/db/`, PGlite):
- `blogSave.test.ts`:
  - create → save → publish → update, including archive rows per action.
  - OQ409 on a stale draft and on stale live.
  - `create_blog` without access → OQ403. Reused key → OQ410.
  - 11 photos, 101-character title, 10,001-character body → OQ422. Empty post → OQ422.
  - Slug `-2` for a duplicate title, and for a slug that belongs to a removed blog under an old handle.
  - A linked Quest of another user is dropped. The own published Quest is kept.
  - Visibility on a draft → OQ422.
- `blogAccess.test.ts`:
  - anon and stranger can't select any blog table.
  - `get_blog` returns public and unlisted, not private or draft, and only the listed fields (no `linked_trip_key`, `search_text`).
  - `get_blog_status` words. `get_blog_quest` hides private, deleted and other-owner Quests.
  - `list_my_blogs` lists own drafts only. The owner reads their private blog by RLS.
- `blogDelete.test.ts`: every row and archive gone, tombstones under old and new handle, notifications gone, `get_blog_status` → `removed`.
- `blogSocial.test.ts` (migration 17):
  - like/unlike idempotent, one notification on the first like ever.
  - comment rate limit shared with Quests.
  - comments off hides comments and blocks new ones. Owner deletes a comment, a stranger can't.
  - likes on a private blog → OQ404.
- `blogDiscovery.test.ts`:
  - `get_profile.blogs` public only, and every old `get_profile` field still present.
  - `list_home_feed` mixes followed Quests and blogs and excludes unlisted/private.
  - `list_explore_blogs`, `search_public.blogs` (by title, body text, place name). `%` escaped.
  - `list_sitemap_blogs` ≥ 80 words only. `list_sitemap_profiles` includes a blogs-only profile.
- `featureAccess.test.ts`: grant by handle, grant everyone, revoke archives, `has_feature_access` per user.
- Extended:
  - `noUpdates.test.ts`: every new table.
  - `grants.test.ts`: every new function with its role list.
  - `notifications.test.ts`: blog rows and the old Quest rows unchanged.
  - `accountDelete.test.ts`: blogs, drafts, likes and comments on others' blogs gone, tombstones kept.
  - `retention.test.ts`: new archive ages.
  - `feed.test.ts`: `list_feed` output byte-for-byte unchanged.

**Storage.** No new bucket, policy or path. Blog photos use `photos/{userId}/{blogKey}/{photoId}/thumb.webp|display.webp` and `exports/{userId}/{blogKey}/{photoId}/export.jpg`, with the same variant names. A removed photo's files are swept after the next post (1 hour grace). Never Supabase image transformations.

## 6. Frontend

Design system rules (decision 0002):
- Only tokens, `design-system/components/` and `color()`. No raw styles in `app/`, `features/` or `lib/` (`noRawStyles.test.ts`).
- Reuse `Button`, `TextField`, `Sheet`, `Toast`, `Segmented`, `Switch`, `ProgressRing`, `Avatar`, `Chip`, `ConfirmDialog`, `TopBar` and `icons`.
- Possible additions: a multi-line `TextArea` in `design-system/components/TextField.tsx` (an auto-growing variant), and pin and Quest icons if `icons.tsx` lacks them. These are design-system component additions. New colours or sizes would need the claude.ai design-system page first, and none are expected.
- Templates are untouched: a blog is an app screen, not a scrapbook template.

### 6.1 Composer (`features/blog-editor/`)

- `BlogComposer.tsx` (client):
  - Top bar: Close (X), save status, Preview, primary Post (one orange button).
  - Title (`TitleField`, large type, autofocus, counter from 80 "n / 100"). Then `PhotoRow`, the body (`TextArea`, auto-grow, placeholder per PRD), `PlaceRow` (S1) and `LinkQuestRow`.
- `blogDraftStore.ts` (Zustand, editor only): `key`, `draftSavedAt`, `blogSavedAt`, `status`, `published?: {slug, path, visibility}`, `document`, `version`, `savedVersion`, `saveStatus: 'saved'|'saving'|'retrying'|'offline'|'conflict'`, `photos: {id, state: 'uploading'|'failed'|'done', previewUrl}`.
- `blogDraftSaver.ts`, `useBlogAutosave.ts`, `localDraft.ts` (localStorage, §3.2).
- `PhotoRow.tsx`:
  - Dashed "+ Add photos" tile (multi-file input, `accept="image/*"`). Thumbnails are square, with ×, and drag to reorder with pointer events (plus move-left/right buttons for keyboard and screen readers).
  - Counter "n of 10". Over the cap: Toast "A blog holds 10 photos."
  - Failed after 3 tries: Retry and Remove.
  - Uses `createUploadQueue(blogKey, browserUploadDeps(folder), …)`. A photo joins `document.photos` on `onUploaded`. GPS from `onProcessed` is discarded.
- `LinkQuestSheet.tsx`:
  - Copy as in PRD B3. Rows show cover, title, places and a visibility tag, newest first, with a single choice. Private rows show "Only you can see this one".
  - Empty state: "You haven't published a Quest yet." with "Create a Quest". It flushes the save, then goes to `/quests/new?source=blog_link`.
  - After a choice, the row becomes a small card with Remove. `blog_quest_linked` fires.
- `PlaceRow.tsx`: "Add a place" with a pin icon, then a search sheet backed by `searchBlogPlaces`. Once chosen, it shows "Goa" with Change.
- `postRules.ts`: `canPost(document, photos)` and the message "Add a title and some text or a photo." while no upload is pending.
- `PostSheet.tsx` (first post only): "Who can see this blog?" with the three options and the PRD copy, defaulting to the Settings "New Quests start as" value. Then the primary "Post".
- Update (already posted): Post flushes, runs `publishBlog` with visibility null, then goes to the blog page with Toast "Blog updated." (founder question 3).
- Preview: a client-side mode rendering `BlogArticle` from the in-memory document with local previews. "Back to edit" and Post. Works offline.
- Close:
  - Empty document: `discardBlogDraft` if a row exists, then back.
  - Otherwise: Toast "Saved as a draft." and back to where the composer was opened (`history.back()`, else `/quests`).
- States:
  - Loading: the edit page server-renders the draft, so no spinner.
  - `not_found`: the `LostDraft`-style message, "This blog isn't here any more." with "Write a blog".
  - Conflict: a banner "This draft was changed somewhere else. Reload." with a Reload button. Autosave stops.
  - Offline: status text.
- `ShareScreen` for blogs (`/blogs/[key]/share`): "Your blog is live!", the link, "Copy link" and "Share to WhatsApp". It reuses `features/shell/ShareLinkButton.tsx` and the Quest share screen's layout.
- `CreateChooser.tsx`:
  - Takes `blogsEnabled`. When on, "Write a blog" is a link to `/blogs/new?source=create` with icon, title and sub-copy, without the pill or toast, and "Create a Quest" stays the larger highlighted option.
  - When off, it renders unchanged.
  - `create_option_tapped{option: 'blog', available}` as today, plus `blog_create_started{source}` when it's available.

### 6.2 Blog page (`features/blogs/`)

- `BlogView.tsx` (server):
  - Top bar: Back (`history.back()`, else `/home`) and share.
  - `WriterRow`: avatar, name, @handle, "3 days ago · 4 min read" via `PublishedAgo`, and Follow on other people's blogs (`FollowButton`, from viewer state).
  - `<h1>` title, place chip.
  - `BlogGallery` (client): swipe with CSS scroll-snap, counter "1 / 4", tap for full screen (`BlogPhotoViewer` dialog). Absent with no photos.
  - `BlogBody`: paragraphs and line breaks. Links become `<a>`. No `dangerouslySetInnerHTML`.
  - The read-end marker.
  - `LinkedQuestCard` under "From this trip": cover, title, "5 pages · 15 photos" and "View Quest". Absent when null. For the owner it also shows "Your linked Quest isn't visible to readers" or their private card, from `/me`.
  - Social block, then the `WriteYourOwnCard`.
- `BlogArticle.tsx`: the pure part (title, gallery, body, place) shared by the page, the owner view and Preview.
- Social:
  - `LiveBlogSocialProvider` wraps `QuestSocialProvider` with `subject="blog"`, blog actions and `useBlogViewer(blogKey, ownerKey)`.
  - Like label from `likeLabel()` ("Like", "1 like", "2 likes"…).
  - Comments are newest last, with "Add a comment". When comments are off: "Comments are off for this blog."
- Owner ⋯ menu (`ManageBlogSheet.tsx`): Edit (`/blogs/[key]/edit`), Share link, Who can see it, Comments on/off, Delete (`ConfirmDialog` "Delete this blog? This can't be undone."). It is opened from the top bar on your own blog, the owner view, your profile list and the Quests tab. Each action fires `blog_managed`. On conflict it reloads the viewer state and shows the existing conflict toast copy.
- `BlogUnavailable.tsx`: "This blog is private." or "This blog was removed.", and nothing else. Owners of a private blog get "Open your blog" from `/api/unavailable-blog`, the same pattern as `UnavailableActions`.
- `useReadEnd.ts` (§3.8). `blog_viewed` fires on mount with `view_id`.

### 6.3 Blogs elsewhere

- **Profile** (`features/profile/ProfileView.tsx`):
  - Under the counts, `Segmented` with Quests · Blogs. On others' profiles it shows only when `profile.blogs.length > 0`. On your own (viewer `isSelf`) it shows when you have access or any blog.
  - Blogs list: one column of `BlogRow` (cover thumb or `LetterTile`, title, one-line excerpt, "4 min read", likes).
  - Own profile: fetches `/api/me/blogs` and adds drafts, unlisted and private blogs with tags.
  - Empty (own only): "No blogs yet. Write about a trip." with "Write a blog".
  - The count row is unchanged, and profiles without blogs render exactly as today.
- **Quests tab** (`features/quests/YourQuestsView.tsx`): the same Quests · Blogs switch above the current content (shown when there is access or any blog). Blogs list from `getMyBlogs()`. Drafts show "Continue editing", posted ones the ⋯ menu.
- **Home feed** (S2): `getFeedPage` switches to `list_home_feed`. `HomeFeed.tsx` renders `BlogFeedCard` for `type: 'blog'`: writer row, a "Blog" tag, title, two-line excerpt, cover if any, then like, comment and share. Like in the feed uses `setBlogLike` with source `feed`.
- **Explore** (S3): `getExplore` adds `blogs` from `list_explore_blogs`. `ExploreView` "Stories and guides" renders `GuideCards`, then `BlogStoryRows` ("Blog · 4 min read · by @username").
- **Search:** `SearchResults.blogs` rendered under "Stories" with the guides.
- **Notifications:** `notificationRows.ts` parses `blog`. `notificationText()`/`notificationHref()` use `item.blog ?? item.quest`, with fallbacks "your blog" and "{name} commented on your blog".

### 6.4 Signed-out visitors and OQ-16

- Every blog surface works signed out and view-only: the blog page, profile Blogs, Explore, search, and feed cards if OQ-16's signed-out feed ever includes them.
- Like, comment, Follow, "Write your own" and card actions call OQ-16's sign-in popup with `{ next: <blog path>, intent: 'like' | 'comment', ref: blogKey }`. After sign-in the person lands back on the blog with `?intent=…`, which `readQuestIntent`/`intentStep` finish: the like is counted, or the comment box opens. The query is then removed (`withoutIntent`).
- OQ-16 merged on 23 Nov (PR #19): signed-out actions use `askToSignIn()` from `features/account/signInPrompt.ts`, and any link to `/login?…` opens the popup (`SignInSheet`). Migration 15 is taken by OQ-16 (`15_open_home`), so blogs use 16 and 17.
- Signed-out Home feed content: OQ-16 decides. This release adds blogs only to the signed-in "people you follow" feed (founder question 5).

## 7. Security and privacy

| Rule (CLAUDE.md / security doc) | Applies? | How the design meets it |
|---|---|---|
| Every new table: RLS on, owner-only policies, database test | Yes | §5. 10 new tables, each with RLS. Tests in `blogAccess`, `noUpdates`, `grants`, `featureAccess` |
| Never an anonymous `select` policy | Yes | Public reads only through `get_blog`, `get_blog_status`, `get_blog_quest`, `get_blog_social`, `list_sitemap_blogs`, `list_explore_blogs`, `search_public`, `get_profile` (security definer, explicit field lists). CLAUDE.md's list of public read functions grows: noted for the CTO (D8) |
| No `dangerouslySetInnerHTML` with user text; JSON-LD escapes `<` | Yes | `BlogBody` builds text nodes and `<a>` elements. Links are only `https?://` URLs, `rel="nofollow ugc noopener"`, `target="_blank"`, and `javascript:` can't match. JSON-LD uses `.replace(/</g, '\\u003c')` |
| Never store photo GPS; images re-encoded in the worker | Yes | Worker reused. The blog composer drops `gps` in `onProcessed`. `BlogPlaceSchema` has no coordinates. Test asserts no `lat`/`lng` in stored or returned blog data |
| Secret key only in `lib/supabase/admin.ts` | Yes | Used only by `previewCoverUrl` and `notifyServer` (existing) |
| `supabase.auth.getUser()` on the server | Yes | `action()`, the `/api/blogs/*` route handlers, `/blogs/*` pages |
| Don't log user text, emails or photo URLs | Yes | Actions log only error names (`action()`). Analytics carries no title, body, place or URL (`chars_bucket` only). Search text is never tracked |
| Unlisted links unguessable | Yes | Random suffix on first publish as unlisted (docs/03 §A.1) |
| A blog never makes a linked Quest more visible | Yes | `get_blog_quest` returns only public/unlisted Quests, so readers can reach an unlisted Quest only from a blog its own writer linked (PRD-accepted: "as they could by its link"). Private Quests are shown only to the owner, through `/me`. The linked key is never in `get_blog`. Unlisted Quest pages stay `noindex, nofollow`, even when linked from an indexed blog |
| Private blog keys don't leak | Yes | `get_blog_status` returns only the word. `/api/unavailable-blog` returns the key only to the owner (RLS) |
| Referrer-Policy keeps unlisted URLs off other hosts | Yes | Existing header. Links in blog text open with `noopener` and the same policy |
| Likes anonymous; view counts team-only | Yes | `get_blog_social` returns a count only. Like notifications carry no actor. Views exist only in PostHog |
| Account deletion (DPDP, docs/03 §B.4) | Yes | §5. Files, rows, archives, likes and comments are gone. Tombstones and handle claims are kept (the same as Quests) |
| Abuse | Partly | Comment rate limit shared with Quests (5 a minute). Reporting and blocking are out of scope (PRD), so the owner's one-tap comment delete is what exists |
| Feature access can't be self-granted | Yes | `feature_access` has no client grants. `grant_*`/`revoke_*` are service role only. `create_blog` checks in the database |
| Local draft backup | Yes | Only on the writer's own device, cleared on sign-out. Never sent anywhere but our own save action |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content` (old rows still parse) | None | Not touched | Existing `toTripData.test.ts` |
| Drafts in progress | None for Quests | Quest draft tables and functions unchanged | Existing `tripSave.test.ts` |
| Migrations (expand → contract, rollback-safe) | Additive | New tables and functions, a nullable column on `notifications`. Replaced functions keep their arguments and every returned field. `list_feed` is kept for the previous release (contract later, Later §15) | `blogDiscovery.test.ts` (old `get_profile`, `search_public` fields), `feed.test.ts` (`list_feed` unchanged) |
| Archived rows (old shapes still readable) | New archives only | Blog archives copy live columns. `BlogDocumentSchema` fields only grow, with defaults | `blogSchema.test.ts` with a minimal `{}`-like document fixture |
| Public functions and their zod schemas | Extended | `get_profile` + `blogs`, `search_public` + `blogs`, `list_my_notifications` + `blog`, `list_sitemap_profiles` more rows, `delete_account_data` more fields. App schemas use `.optional()`/`.default([])` for every new field, so code before or after the migration parses either output | `getProfile` parse test with old and new output |
| Public URLs, slugs, handles, OG | New URLs only | Quest URLs unchanged, an existing Quest with slug `blog` still works (§3.3). New Quests can't take slug `blog`. No handle reserved | `slug.test.ts`; Playwright: `/@h/blog` Quest fixture still opens |
| Existing trip rendering (jitter keys, defaults, templates) | None | Templates untouched | Existing |
| Storage paths and variants | None | Same paths and variant names, new folders keyed by blog key | — |
| Server actions, cache tags, env vars, analytics events | Extended | New actions and tags. `refreshQuestPages` adds one tag. No new env var. New events only, plus `quest_draft_created.source` gains `blog_link` and `notification_sent` gains optional `target` | `taxonomy.test.ts` regenerated from CSVs |
| Notifications on the previous release (rollback) | Degraded, accepted | Old code parses blog notifications (same kinds, unknown `blog` field stripped) and shows "Someone liked your Quest", linking to `/home` | `notificationRows.test.ts` with a blog row through the old schema |
| Blog links on the previous release (rollback) | Broken during rollback, accepted | The old `next.config.ts` has no blog rewrite, so `/@h/blog/s` returns a 404 until roll-forward. Only flagged users have blogs, so exposure is small | Noted for the CTO (R4) |

**Deploy order.**
1. Migration 16, then BL-01 code. Migration 16 is additive, and the previous code ignores it. It must be in place before any code calls the blog functions.
2. Migration 17, then BL-02 code. BL-02's reader schemas accept both outputs.
3. Frontend BL-03, BL-04 and BL-05, in that order.

No blog UI is reachable until someone is granted access (`feature_access` starts empty), so the backend can ship ahead of the frontend safely.

**Breaking changes accepted by the PRD.** None. The two rollback degradations above are for the CTO to accept.

## 9. Performance and cost

- **Blog page LCP:** cached HTML, text server-rendered, the first gallery photo is `display.webp` with width and height set and `fetchpriority="high"`, the rest lazy. The page JS is the social provider (existing), the gallery, the viewer fetch and one IntersectionObserver. Target: LCP < 2.5 s on 4G (HLD §8). 10,000 characters is about 10 KB of HTML.
- **Composer:** local writes are throttled to 500 ms, and saves come at most every 2 to 10 s while typing. Each save is one RPC carrying at most about 12 KB.
- **Database:** about 1 MB of draft archive per heavy 20-minute session, kept 30 days. Feed, Explore and search add one blog subquery each. Explore is cached for 5 minutes.
- **Storage:** at most 10 photos × (thumb ≈ 30 KB + display ≈ 250 KB + export ≈ 1 MB) ≈ 13 MB per blog. Same as about two-thirds of a full Quest. Fine at friends-test scale (D6).
- **New paid services:** none. Resend (already planned), Nominatim (free, same limits) and PostHog (same plan). No Supabase image transformations.
- **Vercel:** 5 PRs, so 5 production deploys plus previews. Granting access needs no deploy.

## 10. Analytics

The events go in the OnQuest Taxonomy sheet first, then the CSVs are exported to `docs/analytics/` and `npm run analytics` regenerates `lib/analytics/taxonomy.ts`, in the BL-02 PR. No user text, titles, emails, photo links or exact locations.

`blog_id` (the key) is added to every blog event, as `quest_id` is on every Quest event. `view_id` joins `blog_viewed` to `blog_read_end` (founder question 8).

| Event | Type | When | Properties |
|---|---|---|---|
| `blog_create_started` | client | "Write a blog" tapped (available) | `source: create \| write_your_own` |
| `blog_draft_saved` | server (`saveBlogDraft`) | At most once per calendar minute per blog | `blog_id`, `chars_bucket: 0 \| 1-500 \| 501-2000 \| 2001-5000 \| 5001-10000`, `photos` (0–10) |
| `blog_quest_linked` | client | A Quest is linked or removed | `blog_id`, `action: link \| remove` |
| `blog_previewed` | client | Preview tapped | `blog_id` |
| `blog_published` | server (`publishBlog`, first publish only) | Post confirmed | `blog_id`, `visibility`, `photos`, `chars_bucket`, `has_quest`, `has_place`, `minutes_since_start` (from `startedAt`) |
| `blog_viewed` | client | Blog page opens | `blog_id`, `view_id`, `signed_in`, `referrer: whatsapp \| instagram \| other \| none`, `has_quest` (whether the card rendered); `anon_id` (common) when signed out |
| `blog_read_end` | client | §3.8 | `blog_id`, `view_id`, `seconds` |
| `blog_quest_opened` | client | View Quest tapped | `blog_id` |
| `blog_liked` | server (`setBlogLike`) | Like or unlike saved | `blog_id`, `unlike: bool`, `source: blog_page \| feed \| after_sign_in` |
| `blog_comment_posted` | server (`postBlogComment`) | Comment saved | `blog_id`, `length` (1–300, never the text) |
| `blog_managed` | server (the ⋯ actions; `edit` = an update posted by `publishBlog`) | A change from the ⋯ menu | `blog_id`, `action: edit \| visibility \| comments \| delete`, `value: public \| unlisted \| private \| on \| off \| none` |
| `create_option_tapped` (existing) | client | — | `available` = flag (meaning unchanged) |
| `quest_draft_created.source` (existing) | server | — | + `blog_link` |
| `notification_sent` (existing) | server | — | + optional `target: quest \| blog` |

Server events are the source of truth for counts, as in the PRD.

## 11. Test plan

- **Unit (Vitest):**
  - `lib/blog/toBlogData.test.ts`: paragraphs, read time, defaults, minimal document.
  - `lib/blog/schema.test.ts`.
  - `lib/slug.test.ts`: `blog` reserved, fallback `blog`.
  - `features/blog-editor/postRules.test.ts`, `photoRules.test.ts`, `titleField.test.ts`, `blogDraftSaver.test.ts` (debounce/max-wait, hide save, offline → online, conflict stops saving, local restore rules), `localDraft.test.ts`.
  - `features/blogs/blogBody.test.ts`: links, no HTML injection, paragraphs.
  - `features/blogs/metadata.test.ts`: index rules, description, canonical.
  - `features/blogs/jsonLd.test.ts` (`<` escaped), `useReadEnd.test.ts` (fake observer and timers: fires once, ≥ 5 s visible, pauses when hidden).
  - `notificationText.test.ts`, `notificationRows.test.ts`: blog rows, old-schema parse.
  - `lib/email/content.test.ts`, `notify.test.ts`: blog wording, `not_configured` path.
  - `deletionTags.test.ts`, `refreshTrip.test.ts`: new tags.
  - `CreateChooser.test.tsx`: flag on/off.
- **Database access (`tests/db/`):** §5 list.
- **Backward compatibility:**
  - `get_profile`/`search_public`/`list_my_notifications` outputs parsed by the **current** app schemas (copied as fixtures) after migrations 15 and 16.
  - `list_feed` output unchanged.
  - Seed data with an existing Quest slugged `blog` still returned by `get_trip`.
  - A blog document fixture with only `{ body: '' }` parses.
- **Playwright** (`tests/e2e/blogs.spec.ts`, mobile viewport, a seeded user with access):
  1. Create → Write a blog → title, 3 paragraphs, 2 photos, link a Quest → Preview → Post Public → share screen link.
  2. Close mid-text → reopen Quests tab → Blogs → Continue editing, text intact.
  3. Signed out: open the link, text visible with no prompt, scroll to the end (`blog_read_end` captured once after 5 s), View Quest, Back (scroll within 50 px).
  4. Like → sign-in (test login) → back liked.
  5. Owner: comments off, Unlisted, delete → link says "This blog was removed."
  - `blog_read_end` also at three viewports (§3.8).
  - The existing Quest smoke test stays green.
- **Human UX tests (founder, real phone, Vercel preview with access granted):** the PRD's 5 cases unchanged. Add case 6: open the same draft in two tabs, type in both, and check the second tab shows "This draft was changed somewhere else. Reload."

## 12. Tasks

Build mode: **Backend + Frontend split**. The backend lands first: BL-01 is the contract and core, BL-02 the social and discovery. The frontend can start BL-03 on fixtures once BL-01's contract files merge. Five PRs in total, sized as batches because of the deploy cap. They are larger than the usual ~400 lines, mostly SQL and tests. Each can still be tested on its own.

| ID | Owner | Task | Touches | Covers ACs | Depends on | Done when |
|---|---|---|---|---|---|---|
| BL-01 | backend | Blog contract, data core and access flag | `lib/blog/*`, `lib/slug.ts`, `lib/cacheTags.ts`, migration 16, `tests/db/blog*.test.ts`, `featureAccess.test.ts`, `noUpdates`/`grants`/`accountDelete`/`retention` tests, `features/blog-editor/actions.ts`, `features/blogs/actions.ts` (draft, publish, visibility, comments, delete, places), loaders (`getBlog`, `getBlogStatus`, `getLinkedQuest`, `getBlogDraft`, `getOwnBlog`, `getOwnPrivateBlogKey`, `getMyQuestsForLinking`), `features/blogs/refreshBlog.ts`, `features/editor/refreshTrip.ts`, `features/account/{actions,deletionTags,accountDeletion}.ts`, `docs/runbooks/feature-access.md` | B2, B3, B4, B5 (server), B7, B9 (server), B11 delete, edge: slugs, two tabs (server) | — | Migration 16 runs on seed. All listed DB and unit tests pass. Contract files exactly as §4.1. Production `slug = 'blog'` count in the PR. CI green |
| BL-02 | backend | Blog social, notifications, feed, Explore, search, profile, email, analytics | migration 17, `tests/db/{blogSocial,blogDiscovery}.test.ts` + `notifications`/`feed`/`accountDelete`/`retention`/`grants`/`noUpdates`, `features/blogs/socialActions` + actions (`setBlogLike`, `postBlogComment`, `deleteBlogComment`), `getBlogSocial`, `app/api/blogs/[key]/me`, `app/api/unavailable-blog`, `app/api/me/blogs`, `getMyBlogs`, `features/home/getHome.ts`, `features/explore/{getExplore,searchPublic}.ts`, `features/profile/getProfile.ts`, `features/notifications/notificationRows.ts`, `lib/social/{schema,cardRows}.ts`, `lib/email/*`, `docs/analytics/*.csv`, `lib/analytics/taxonomy.ts` | B10 (server), B11 comments, B12, B13, S1–S3 (server) | BL-01 | Migration 17 runs. Old-shape parse tests pass. Email path returns `not_configured` without Resend and builds blog wording with it. Taxonomy regenerated. CI green |
| BL-03 | frontend | Composer: Create chooser, write, photos, place, Link a Quest, preview, post, share | `features/shell/CreateChooser.tsx`, `app/(app)/create/page.tsx`, `app/(app)/(create)/blogs/{new,[key]/edit,[key]/share}/*`, `features/blog-editor/*` (UI, store, saver, local draft), `design-system/components/TextField.tsx` (TextArea variant), `icons.tsx` if needed, `proxy.ts`, `robots.ts` | B1, B2, B3, B4, B5, B6, B7 (posting), edges: offline, upload failure, two tabs, close | BL-01 (BL-02 not needed) | All composer states work on a real phone preview. Unit tests listed in §11 pass. "Releasing soon" unchanged without access |
| BL-04 | frontend | Blog page, owner view, ⋯ menu, SEO, OG, read-end | `next.config.ts` rewrite, `app/(public)/b/[handle]/[slug]/{page,opengraph-image}.tsx`, `app/(app)/blogs/[key]/page.tsx`, `features/blogs/*` (view, article, body, gallery, viewer, unavailable, manage sheet, metadata, jsonLd, useReadEnd, LiveBlogSocialProvider), `features/trip-page/useQuestSocial.tsx` + `LikeButton`/`Comment*` (`subject` prop, Quest default unchanged), `app/sitemap.ts`, `features/profile/metadata.ts` | B7, B8, B9, B10, B11, edges: text only, links, 10 photos + 10k chars | BL-01, BL-02 | Lighthouse mobile LCP < 2.5 s on preview. View source shows title and body. Sitemap lists a ≥ 80-word public blog. Quest page tests unchanged and green |
| BL-05 | frontend | Blogs everywhere + Playwright | `features/profile/ProfileView.tsx` (+ `BlogRow`, `LetterTile`), `features/quests/YourQuestsView.tsx`, `features/home/{HomeFeed,BlogFeedCard}.tsx`, `features/explore/{ExploreView,BlogStoryRows}.tsx`, search results UI, `features/notifications/notificationText.ts`, `tests/e2e/blogs.spec.ts` | B5 (list), B12, B13 (UI), S2, S3; Playwright for B1–B11 | BL-02, BL-03, BL-04 | Profiles without blogs pixel-identical (screenshot test). Playwright `blogs.spec.ts` green at three viewports. Existing smoke green |

The full issue texts are in Appendix A. They were not created on GitHub, as instructed.

## 13. Decisions

| # | Decision | Options considered | Choice | Reason | Needs CTO sign-off? |
|---|---|---|---|---|---|
| D1 | Likes and comments for blogs | (a) Shared tables with a target type; (b) `blog_key` column on existing tables; (c) separate `blog_likes`/`blog_comments`, shared `notifications` | (c) | Nothing Quest-side changes (no nullable `trip_key`, no partial uniques, no rewrite of a dozen counting functions), and the previous release stays safe. The bell is one stream, so notifications are shared with a nullable `blog_key`. "Copy once, abstract the third time" | Yes |
| D2 | Draft model | (a) One `blogs` table, autosave straight to the live row; (b) live + working draft (Quest model) | (b) | Half-typed edits never go public, autosave never clears public caches, and it matches what writers already know from Quests | Yes |
| D3 | Blog route folder | (a) `app/(public)/u/[handle]/blog/[slug]`; (b) `app/(public)/b/[handle]/[slug]` + rewrite | (b) | (a) puts a static `blog` folder next to `[slug]` and risks breaking an existing Quest slugged `blog` | No |
| D4 | Feature flag | (a) Env var allowlist (a redeploy per change); (b) PostHog flags (a new runtime call, and the app avoids posthog-js); (c) `feature_access` table + DB check | (c) | No deploys under the cap, enforced in the database, auditable, and reusable for the next feature | Yes |
| D5 | Blog draft archive retention | 180 days (as Quests) / 30 days | 30 days | Autosave while typing makes about 10× more archive rows than Quest editing. Published history is kept 180 days. Depends on the decision 0001 retention amendment (spec A C-A16) | Yes |
| D6 | Upload `export.jpg` for blog photos | (a) Skip it (saves about 1 MB a photo); (b) keep the queue unchanged | (b) | The OG renderer can't read WebP, so the cover's export JPEG gives link previews a photo. No branching in the upload code. Leaves room for blog Instagram export later | Yes (storage cost) |
| D7 | Home feed function | Change `list_feed`'s output / new `list_home_feed` | New function | The previous release's parser would reject blog items in `list_feed`. Contract `list_feed` later | No |
| D8 | Public read functions | — | Add `get_blog`, `get_blog_status`, `get_blog_quest`, `get_blog_social`, `list_sitemap_blogs`, `list_explore_blogs` | CLAUDE.md lists the public read functions by name. The list needs updating with this spec (CTO edits CLAUDE.md) | Yes |
| D9 | Profiles with only public blogs | Stay `noindex` / become indexable and in the sitemap | Indexable | A profile with public writing isn't thin. The rule changes from "≥ 1 public Quest" to "≥ 1 public Quest or blog" | Yes (SEO rule in docs/03) |
| D10 | Reserve `blog` | As a handle / as a new Quest slug / neither | New Quest slug only | Handles can't clash (`/@` prefix), and reserving one would block an existing owner's profile saves. The Quest slug keeps `/@h/blog` free for a future index page | No |
| D11 | Read-through measure | Scroll % / end-marker visibility + 5 s visible time | Marker + 5 s | The same on every screen size and browser, and short blogs don't count as read on open | No |

## 14. Risks and open questions

**Technical (for the CTO):**
- **Signed off by the CTO (Swati), 23 Nov 2026:** D1, D2, D4, D5, D6, D8 and D9, and R4 (roll forward only after blogs exist). D5 also needs the 0001 retention amendment (C-A16), which `run_retention_cleanup` already depends on.
- R1: Two migrations replace `delete_account_data`, `run_retention_cleanup`, `list_my_notifications`, `get_profile` and `search_public`. A parallel ticket (OQ-16) touching the same functions would conflict, so each migration must start from the latest definition. BL-01 and BL-02 rebase onto OQ-16 if it lands first.
- R2: The 10,000-character body in `search_text` makes trigram indexes larger. That is fine at this scale. Revisit with full-text search (`tsvector`) if search slows (Later).
- R3: resolved. OQ-16 merged on 23 Nov (PR #19); its migration is 15, so blogs use 16 and 17.
- R4: Rolling back the app code after blogs exist 404s blog links and shows blog notifications as "your Quest" until roll-forward. Accept, or roll forward only.
- R5: iOS Safari doesn't open the keyboard on `autoFocus` after a navigation. The cursor is in Title, but the keyboard may need a tap. UX test 1 checks it. There is no workaround without a user gesture.
- CLAUDE.md's "Public pages read only via…" list and the HLD caching table need the new functions and tags (§16). CLAUDE.md is the CTO's to edit.

**Product (for the founder),** each answerable in one line. Swati (CTO) is OK with all nine (23 Nov 2026); Alok to confirm as the PRD owner:
1. Likes on blogs show the real count from the first like ("Like", "1 like", "2 likes"…), per your 21 Nov decision, instead of B5's "Be the first to like this". Confirm?
2. Two tabs: the save that reached the server first is kept, and the tab that is behind shows "This draft was changed somewhere else. Reload." Its unsaved text is lost on reload. Is that what "the later save wins" means?
3. Editing a posted blog: changes go live when you tap Post again (as with Quests), the visibility sheet is skipped, and you land on the blog with "Blog updated." OK, including that copy?
4. Unlisted blogs get a random 6-character ending like unlisted Quests (`/@riya/blog/goa-on-15k-k3f9x2`), not the plain title link shown in B4. OK?
5. This release adds blogs only to the signed-in feed ("people you follow"), not to the signed-out Home feed from OQ-16. OK?
6. Explore's "Stories and guides": OnQuest guides first, then public blogs ranked by likes, comments and recency. OK?
7. The flag gates only writing. Everyone can read, like and comment on blogs, and see Blogs on profiles (only flagged people's blogs exist). OK?
8. Analytics: every blog event also carries the blog's id, and views carry a view id, so read-through can be matched per view (no user text). OK to add to the Taxonomy sheet?
9. While photos are still uploading, Post stays greyed out with a progress ring and no message. OK, or do you want copy (e.g. "Uploading photos…")?

## 15. Later

- C1 (bold, heading, bullet list) and C2 (photos between paragraphs): the body stays plain text now. A future rich format would be a new optional `blocks` field, with `body` kept for old rows.
- S4 "Write about this trip" from a Quest's ⋯ menu, and the post-publish tooltip.
- An `/@handle/blog` index page (the slug is reserved for it).
- Blog places as Explore place chips and in "everyone's Goa" pages (`geoRef` is stored).
- Instagram export for blogs (export JPEGs already exist).
- Full-text search (`tsvector`) if trigram on long text slows.
- Contract step: drop `list_feed` once no release uses it.
- Private bucket + signed URLs for private blogs (docs/03 §A.2, the same trade-off as Quests: making a blog private doesn't revoke photo URLs already seen; delete removes them).
- Reporting and blocking for blogs and comments.

## 16. Doc updates that belong in this spec PR

These were not written in this pass: the brief asked for the spec file only. The Tech Lead or CTO applies them before approval.

- `docs/01-hld.md`:
  - §3.2: blogs tables.
  - §5: a "Write and post a blog" flow.
  - §6 caching table: add `/@handle/blog/slug` (tag `blog-url:{handle}/{slug}`), blog social (`blog-social:{key}`), linked Quest cards (`blog-quests:{ownerKey}`), and owner view `/blogs/[key]` (never cached).
- `docs/02-lld.md`:
  - §1: `features/blogs`, `features/blog-editor`, `lib/blog`.
  - §3.1 and §3.3: blog tables and functions.
  - §4: blog actions.
  - §5.5: blog autosave and offline backup.
- `docs/03-security-visibility-seo.md`:
  - §A.1: add a Blogs column. The owner of a private blog sees it at `/blogs/[key]`.
  - §C.1: blog index rules, and the profile rule from D9.
- `CLAUDE.md` (CTO): the public read function list, and the cache tag rule (add `blog-url:` / `blog-social:` / `blog-quests:`).

---

## Appendix A. GitHub issue drafts

Not created (per instruction). Labels for each: `spec:blogs` plus the owner label. The body is the block below plus a link to `docs/specs/blogs.md`.

### BL-01 · backend · Blogs: contract, data core and access flag

**Spec:** `docs/specs/blogs.md` §3.1–3.3, §3.9, §4.1–4.3 (migration 16), §5
**Depends on:** none. Rebase on OQ-16 first if it has merged a migration.

**Build**
- Contract files exactly as §4.1:
  - `lib/blog/{limits,schema,cards,toBlogData}.ts`.
  - `lib/slug.ts` (`blog` reserved, `fallback` param).
  - `lib/cacheTags.ts` (3 new tags).
- `supabase/migrations/20261124100000_16_blogs.sql`:
  - Tables, RLS and grants (§5).
  - `has_feature_access`, `grant_/revoke_feature_access`, `create_blog`, `save_blog_draft`, `publish_blog`, `set_blog_visibility`, `set_blog_comments`, `delete_blog`, `get_blog`, `get_blog_status`, `get_blog_quest`, `list_sitemap_blogs`, and the helpers.
  - Replaced `delete_account_data` (+ `own_blogs`), `list_pending_deletions` and `run_retention_cleanup`.
- Actions:
  - `features/blog-editor/actions.ts`: `saveBlogDraft` (create or save, `blog_draft_saved` at most once a minute), `discardBlogDraft`, `searchBlogPlaces`.
  - `features/blogs/actions.ts`: `publishBlog` (+ photo sweep in `after()`, `blog_published`, `blog_managed{edit}` on updates), `setBlogVisibility`, `setBlogComments`, `deleteBlog` (files first).
  - Error mapping as in §4.2.
- Loaders:
  - `getBlog` (cached, `blog-url` tag), `getBlogStatus`.
  - `getLinkedQuest` (cached, `blog-quests:{owner}` tag).
  - `getBlogDraft`, `getOwnBlog`, `getOwnPrivateBlogKey`, `getMyQuestsForLinking`.
- `features/blogs/refreshBlog.ts` (`refreshBlogPages`). `refreshQuestPages` + `blogQuestsTag`. `refreshAfterProfileSave` + own blog URLs. `deletionTags` + `ResultSchema` new fields (`.default([])`).
- `docs/runbooks/feature-access.md`: grant and revoke founders, friends-test users and everyone.
- Run `select count(*) from public.trips where slug = 'blog'` on production (read-only) and post the number in the PR.

**Acceptance criteria**
- With no access row, `create_blog` → OQ403. After `grant_feature_access('blogs', handle)`, it succeeds.
- Autosave archives one draft row per save. A stale `basedOn` → `conflict`.
- Publish: title only → `empty`. 11 photos, a 101-character title or a 10,001-character body → rejected. A duplicate title → `-2`. Unlisted gets a 6-character suffix. The slug never changes on update.
- A linked Quest that isn't the writer's published Quest is dropped on publish. `get_blog_quest` returns null for private, deleted or another owner's Quests.
- `get_blog` returns only public/unlisted published blogs and only the §4.1 fields.
- `delete_blog` removes every row and archive and writes tombstones under every handle. `get_blog_status` → `removed`. Private → `private`.
- Account deletion removes blogs and archives and keeps tombstones.

**Tests:** `tests/db/{blogSave,blogAccess,blogDelete,featureAccess}.test.ts`, extended `noUpdates`, `grants`, `accountDelete`, `retention`. Unit: `lib/blog/*.test.ts`, `lib/slug.test.ts`, `deletionTags.test.ts`, `refreshTrip.test.ts`.

**Done when:** migration 16 runs on seed, all the tests above pass, CI is green, and the production `slug = 'blog'` count is in the PR.

### BL-02 · backend · Blogs: likes, comments, notifications, feed, Explore, search, profile, email, analytics

**Spec:** `docs/specs/blogs.md` §3.4–3.6, §3.8 (events), §4.2–4.3 (migration 17), §10
**Depends on:** BL-01

**Build**
- `supabase/migrations/20261124110000_17_blog_social.sql`:
  - `blog_likes`, `blog_comments` and their archives (RLS, grants).
  - `notifications.blog_key` + check + index.
  - `set_blog_like`, `post_blog_comment` (rate limit across both comment tables), `delete_blog_comment`, `get_blog_social`, `get_my_blog_state`, `list_my_blogs`, `list_my_comment_blog_keys`, `blog_card_json`, `list_home_feed`, `list_explore_blogs`.
  - Replaced `search_public`, `get_profile`, `list_sitemap_profiles`, `list_my_notifications`, `delete_blog`, `delete_account_data`, `list_pending_deletions` and `run_retention_cleanup`. Same arguments, every old field kept.
- Actions `setBlogLike`, `postBlogComment`, `deleteBlogComment` (tags, `after()` email, server events).
- `getBlogSocial`, `getMyBlogs`.
- Route handlers `/api/blogs/[key]/me`, `/api/unavailable-blog`, `/api/me/blogs` (all `no-store`).
- Readers:
  - `lib/social/{schema,cardRows}.ts`: `HomeFeedItem`, `blogs` in search, `blog` in notifications, `BlogViewer`.
  - `getFeedPage` → `list_home_feed`. `getExplore` + blogs. `searchPublic` + blogs. `getProfile` + blogs (optional). `notificationRows` + blog.
- Email: `NotifyEvent.blogKey`, `NotifyDeps.blog`, `notifyBlogOwner`, blog wording in `content.ts`.
- Analytics: add the §10 events to the Taxonomy sheet, export the CSVs, and run `npm run analytics`.

**Acceptance criteria**
- Like/unlike is idempotent, and only the first like ever notifies. Comments off hides comments and blocks new ones. The owner deletes a comment, a stranger can't.
- The bell lists a blog comment with the blog's title, linking to `path#comments`.
- Aman with 2 public blogs and 1 unlisted: `get_profile.blogs` has 2.
- Unlisted and private blogs are absent from `get_profile`, `list_home_feed`, `list_explore_blogs` and `search_public`.
- Search finds a public blog by a word in its body and by its place name.
- Every field the current app reads from `get_profile`, `search_public`, `list_my_notifications` and `list_feed` is unchanged. The old schemas still parse them.
- Without `RESEND_API_KEY`, blog notifications return `not_configured` and the bell still works. With Resend configured (test deps), the email says "your blog".

**Tests:** `tests/db/{blogSocial,blogDiscovery}.test.ts`, extended `notifications`, `feed`, `accountDelete`, `retention`, `grants`, `noUpdates`. Unit: `notificationRows`, `cardRows`, `lib/email/*`, `taxonomy.test.ts`.

**Done when:** migration 17 runs on seed, the old-shape parse tests pass, the taxonomy is regenerated, and CI is green.

### BL-03 · frontend · Blogs: composer (write, photos, place, Link a Quest, preview, post, share)

**Spec:** `docs/specs/blogs.md` §3.2, §3.9, §6.1
**Depends on:** BL-01 (it can start on fixtures from the BL-01 contract files)

**Build**
- `CreateChooser` with `blogsEnabled` (from `/create`'s server read of `has_feature_access`). It is unchanged without access.
- Routes `/blogs/new` (redirect to `/create` without access, resume `oq_blog_draft:new`), `/blogs/[key]/edit`, `/blogs/[key]/share`. All `noindex`. `proxy.ts` matcher, `robots.ts`.
- `features/blog-editor/`: `BlogComposer`, `TitleField`, `PhotoRow` (upload queue, reorder, 10 cap, Retry/Remove), `PlaceRow`, `LinkQuestSheet`, `PostSheet`, preview mode, `postRules`, `photoRules`, `blogDraftStore`, `blogDraftSaver`, `useBlogAutosave`, `localDraft`. Sign-out clears local drafts.
- A `TextArea` variant in `design-system/components/TextField.tsx`. Icons only if missing. No new tokens.
- Client events `blog_create_started`, `blog_quest_linked`, `blog_previewed`.

**Acceptance criteria**
- PRD B1–B7 composer rows and the edge cases in §2 (offline, upload failure, two tabs, close empty, close with content).
- GPS from the worker never reaches the store or any request.

**Tests:** `postRules`, `photoRules`, `titleField`, `blogDraftSaver`, `localDraft`, `CreateChooser`, `BlogComposer` (preview keeps text), `LinkQuestSheet` (empty state). `noRawStyles.test.ts` green.

**Done when:** the composer works end to end on the Vercel preview on a real phone (offline toggle included), CI is green, and "Releasing soon" shows for a user without access.

### BL-04 · frontend · Blogs: blog page, owner view, ⋯ menu, SEO, OG, read-end

**Spec:** `docs/specs/blogs.md` §3.3, §3.7, §3.8, §6.2, §6.4
**Depends on:** BL-01, BL-02. OQ-16's popup if merged (else the `signInPath()` fallback, switched once OQ-16 lands).

**Build**
- `next.config.ts` rewrite `/@:handle/blog/:slug` → `/b/:handle/:slug`.
- `app/(public)/b/[handle]/[slug]/page.tsx` (cached, old-handle 308, unavailable states) and `opengraph-image.tsx`. `app/(app)/blogs/[key]/page.tsx` (owner view).
- `features/blogs/`: `BlogView`, `BlogArticle`, `BlogBody`, `BlogGallery`, `BlogPhotoViewer`, `WriterRow`, `LinkedQuestCard`, `WriteYourOwnCard`, `BlogUnavailable`, `ManageBlogSheet`, `LiveBlogSocialProvider`, `useBlogViewer`, `useReadEnd`, `metadata.ts`, `jsonLd.ts`.
- `QuestSocialProvider`, `LikeButton`, `CommentList` and `CommentComposer` gain `subject: 'quest' | 'blog'` (default `'quest'`; Quest behaviour unchanged).
- `app/sitemap.ts` + `list_sitemap_blogs`. `features/profile/metadata.ts` index rule (D9).
- Client events `blog_viewed`, `blog_read_end`, `blog_quest_opened`.

**Acceptance criteria**
- PRD B7 (reader side), B8, B9 (both rows), B10, B11 (both rows).
- Edge cases: text only, links, 10 photos + 10k chars.
- §3.7 index rules. JSON-LD escapes `<`. View source shows the title and body.

**Tests:** `blogBody`, `metadata`, `jsonLd`, `useReadEnd`, `BlogArticle` (no gallery without photos). The existing Quest page tests stay unchanged and green.

**Done when:** Lighthouse mobile LCP < 2.5 s on preview, the sitemap lists a ≥ 80-word public blog, and CI is green.

### BL-05 · frontend · Blogs everywhere (profile, Quests tab, feed, Explore, search, bell) + Playwright

**Spec:** `docs/specs/blogs.md` §6.3, §11 (Playwright)
**Depends on:** BL-02, BL-03, BL-04, and OQ-16 merged (it touches the Home feed).

**Build**
- Profile Quests · Blogs switch (others: only with public blogs; own: with access or any blog), `BlogRow`, `LetterTile`, the own-profile list from `/api/me/blogs`, and the empty state copy.
- `YourQuestsView`: the same switch, the Blogs list with "Continue editing" and ⋯.
- `HomeFeed` renders `BlogFeedCard` (signed-out actions → OQ-16 popup).
- `ExploreView` "Stories and guides": guides, then `BlogStoryRows`. Search groups blogs under "Stories".
- `notificationText`/`notificationHref` handle `blog`.
- `tests/e2e/blogs.spec.ts` (§11), including `blog_read_end` at three viewports.

**Acceptance criteria**
- PRD B5 (list), B12, B13 (UI), S2, S3.
- A profile without blogs renders exactly as before (screenshot test).

**Tests:** `notificationText`, a profile screenshot test, Playwright `blogs.spec.ts`. The existing smoke test stays green.

**Done when:** Playwright is green at three viewports, CI is green, and the PRD UX tests 1–5 (+ 6) are ready for the founder on preview.
