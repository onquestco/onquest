# Spec B: Quest page, likes, comments, notifications, views and Instagram export (OnQuest MVP)

| | |
|---|---|
| PRD | `docs/prds/onquest-mvp.md` (approved by the founder on 2026-11-09; social layer re-approved the same evening) |
| Status | Draft, for Reviewer plan review then CTO approval |
| Build mode | Backend + Frontend split. Templates, player and page chrome start now on sample data; reactions backend after spec A's migrations |
| Tracker IDs | B-01 … B-11 in `docs/specs/onquest-mvp-tasks.md` |
| Depends on | Spec A (`docs/specs/onquest-mvp-a-create.md`): keys, `trips` document, `get_trip`, sign-in return paths, analytics plumbing |

## 1. Summary

A friend opens a Quest link from WhatsApp, with no sign-in, and it plays page by page: cover, photo pages, a route page, then back to the cover. They can go full screen, like (signing in first if needed, then landing back with the like counted), comment, and tap "Make your own Quest". The creator sees likes and comments in the bell within a minute and by email, can delete comments and turn them off, and can download the Quest as an Instagram story and carousel.

Technically: both templates become paged Quests built on one shared player; three new record types (likes, comments, notification "seen" marks) follow decision 0001, plus insert-only notifications; social data is cached under its own tag so a like doesn't rebuild the page; emails go through Resend; unique viewers are counted in PostHog, never in our database.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| M7: preview shows the Quest exactly as a viewer would | Same `TripPage` + `QuestPlayer` for preview and viewer (B-02) | UX task 1 |
| M8: private link → "This Quest is private." and no photos | `get_trip_status()` (B-01), `QuestUnavailable` (B-07) | `tests/db/questStatus.test.ts`; UX |
| M9: public link opens signed out on 4G, first page without sign-in prompt | Cached HTML, cover image `priority`, social section streamed after (B-02, B-07) | Lighthouse mobile run on preview; UX task 4 |
| M9: route page → forward → cover | `QuestPlayer` loop (B-02) | `questPlayer.test.tsx` |
| M9: full screen shows only the Quest, counter, close, like; close returns to the same page | `QuestFullscreen` (B-03) | `questFullscreen.test.tsx` |
| M10: like when signed out → sign in → back on the Quest, count +1, heart filled; tap again un-likes | `/login?intent=like&next=…` (A-06), `useQuestIntent` + `setLike` (B-05, B-07) | `tests/db/likes.test.ts`; UX task 4 |
| M11: "Add a comment" signed out → sign in → back with the box open | `intent=comment` (A-06, B-07) | UX task 4 |
| M12: "Make your own Quest" stays visible while scrolling | `MakeYourOwnBar` sticky (B-03) | UX |
| M12: no "Make your own" on my own Quest | `/api/quests/[key]/me` → `isOwner` (B-05) | `meRoute.test.ts` |
| M13: comment → bell shows 1 unread within 1 minute | `notifications` insert in `post_comment` (B-01); 30 s polling (B-08) | `tests/db/notifications.test.ts`; UX task 5 |
| M13: email for likes and comments | `lib/email/notify.ts` via Resend (B-06) | `notify.test.ts` (Resend mocked) |
| M14: owner deletes any comment; turns comments off → hidden, "Comments are off for this Quest." | `delete_comment`, `set_trip_comments` (A-04), `get_trip_social` hides when off (B-01) | `tests/db/comments.test.ts`; UX task 5 |
| M16: deleted Quest's link → "This Quest was removed." | Tombstone from `delete_trip` (A-03) read by `get_trip_status` (B-01) | `tests/db/questStatus.test.ts` |
| M17: 5-page Quest → story image + carousel of pages, each showing the link | `StoryFrame`, `CarouselFrames` (both templates), `features/export` (B-09) | Playwright frame size check (B-11); UX |
| M26 (email part): like-email switch off → bell yes, email no | Settings check in `notify.ts` (B-06) | `notify.test.ts` |
| S2: one-tap stop link in every email | Signed unsubscribe link + `List-Unsubscribe` header (B-06) | `unsubscribe.test.ts` |
| S3: "Be the first to like this" instead of a zero | `LikeButton` (B-03); see F-B1 | `LikeButton.test.tsx` |
| Edge: spam likes — one per person | Unique `(trip_key, user_key)` on live likes; `set_like` idempotent (B-01) | `tests/db/likes.test.ts` |
| Edge: abusive comment — owner deletes in one tap | `deleteComment` (B-05) | UX task 5 |
| Privacy: likes anonymous to viewers; creator sees a count, not names | Like notifications store no actor; `get_trip_social` returns only a count (B-01) | `tests/db/likes.test.ts` |
| Privacy: view counts for the OnQuest team only | No view data in the database or any UI; PostHog only (§3.6) | Review |

## 3. Approach

### 3.1 The Quest player and templates

The PRD changes how a Quest reads: a **cover**, then one **page** per stored day (each up to 3 photos), then a **route page**, looping back to the cover. Both templates use one shared player, so templates stay layout + CSS:

- `templates/shared/questPlayer.tsx` (`'use client'`): `QuestPlayerProvider` (current page, page count, `goTo`, `next`, `previous`, full screen on/off), `useQuestPlayer()`, and `QuestPages` (scroll-snap container). Tap the right 60 % of a page → next; left 40 % → previous; swipe and arrow keys too; on the route page "next" goes to the cover. All page markup is server-rendered; the player only adds behaviour, so every caption and title is in the HTML (SEO, link previews). Drop-in animation runs only when a page comes into view, and never when `prefers-reduced-motion` is set.
- `templates/shared/pages.ts` (pure): `toQuestPages(trip)` → `[cover, ...photoPages, route?]`. Old trips whose days hold more than 3 photos are split into continuation pages of 3 (same day title, "· 2"), so a 60-photo test trip still plays with no empty boxes. A day with no photos is skipped. The route page is left out when the trip has fewer than 2 places (nothing to draw); then the last photo page loops to the cover.
- Each template provides `CoverPage`, `PhotoPage` (layouts for 1, 2 and 3 photos, positions in % of the `Stage`, rotation from `jitter(seed, photo.id)`), and `RoutePage` (reuses `MapSection`: places in visit order, dashed path, MapLibre loaded only when the page is near).
- **Beach** is reworked from the scrolling scrapbook to this format; the Goa reference keeps the look (paper, tape, fonts, palette). Existing test trips change look, as the PRD replaces v1. `jitter` keys and the algorithm are unchanged.
- **Mountain** is a new template folder (`templates/mountain/`), visual reference: the prototype's Mountain preview. Registered in `templates/registry.ts`.

### 3.2 The Quest page and caching

```
/@handle/slug ──getTrip (cached, tag trip-url:{handle}/{slug})──> TripView
   ├─ QuestPlayerProvider
   │    ├─ template.TripPage(trip)                    server HTML, cached
   │    └─ QuestFullscreen (client)                   counter "2 / 6", close, LikeButton
   ├─ QuestByline: creator name + photo → /@handle; Follow (spec C)
   ├─ <Suspense> QuestSocial ──getQuestSocial (cached, tag trip-social:{key})
   │       like count, comments (newest last), "Add a comment", or "Comments are off for this Quest."
   ├─ MakeYourOwnBar (sticky; hidden for the owner)
   └─ useViewerState() ── GET /api/quests/{key}/me (no-store) → { signedIn, liked, isOwner }
getTrip null ──get_trip_status──> 'private' → "This Quest is private."
                               └─ 'removed' → "This Quest was removed."
                               └─ null → resolve old handle (spec C) → 308 redirect, else 404
```

- The page HTML is cached by URL as today. Likes and comments change often, so they live in a separate cached loader with tag `trip-social:{tripKey}`, refreshed by every like, unlike, comment, comment delete and comments switch. A like never rebuilds the template HTML.
- Viewer-specific state (signed in, liked, owner) is fetched in the browser after load from a tiny no-store route, so the cached page never reads cookies. Until it answers, the like button shows the count unfilled and "Make your own Quest" is rendered but hidden for 300 ms max; the owner check then removes it (M12 own Quest).
- The bottom bar is hidden on the Quest page (spec C's shell). The owner's ⋯ menu is spec C (C-07), mounted here when `isOwner`.
- **Private and removed:** `get_trip_status(handle, slug)` returns only `'private'`, `'removed'` or null, never any Quest data. These pages render the message with `robots: noindex` and HTTP 200 (Next can't send a 404 with a custom body per URL without `notFound()`, which can't take props); unknown URLs stay real 404s (CTO decision C-B5).
- **Index rules** (unchanged from `docs/03` §C.1): public with ≥ 80 words → index; public with fewer → `noindex, follow`; unlisted → `noindex, nofollow`. See F-B3: with 60-character captions, most Quests will be `noindex`.
- **Link previews:** `opengraph-image.tsx` next to the page: cover photo as a tilted polaroid, title, `@handle`, ≤ 300 KB, cached with the page tag.

### 3.3 Likes (decision 0001)

- `likes` live table: one row per `(trip_key, user_key)` (unique). Like = insert; unlike = move the row to `likes_archive` (reason `delete`) with no successor. A later re-like is a new record with a new key.
- `set_like(p_trip_key, p_liked)` is **idempotent "set state"**: it takes the state the person wants, not an edit of an earlier row, so there is no `saved_at` to conflict on (exception to 0001 rule 4, CTO decision C-B1). Repeated taps never add likes (spam edge case).
- Visible only for Quests the person can see (published public or unlisted, or their own). Returns `{ liked, like_count }`.
- Notification: only the **first ever** like from that person on that Quest (no live or archived like before), and never for the owner's own like. The notification stores **no actor**, so the creator sees "Someone liked your Quest", never who (PRD privacy).
- Display: count hidden below 3 ("Be the first to like this" at 0; at 1–2 see F-B1). Owners see the same.

### 3.4 Comments

- `comments` live table: `key`, `trip_key`, `author_key`, `body` (1–300 characters, plain text, shown with `white-space: pre-line`, React-escaped). No editing in the MVP. Owner delete = archive (reason `delete`); archived comments are kept for abuse follow-up and readable only by their author and admin tasks.
- `post_comment` checks: signed in, Quest visible to them, `comments_on`, and at most 5 comments per person per minute (`OQ429`). Inserts a `comment` notification for the owner (not for the owner's own comments).
- Comments off (`set_trip_comments` in spec A) hides every comment in `get_trip_social` and blocks new ones; turning comments on shows them again.
- `get_trip_social` returns at most the newest 100 comments, oldest first ("newest last").

### 3.5 Notifications (bell and email)

- `notifications`: insert-only (rows never change), written inside `set_like`, `post_comment` and spec C's `set_follow`. Kinds: `like`, `comment`, `follow`.
- "Read" is a record too: `notification_reads` (key = the user's key) holds `seen_until`; opening the notifications screen calls `mark_notifications_seen(until)` (archive + insert, conflict-free because it only moves forward: `greatest(old, new)`). Unread = notifications newer than `seen_until`.
- The bell (in spec C's header) polls `GET /api/notifications/unread` every 30 s while the tab is visible, on focus and after navigation: M13's "within 1 minute" without Realtime.
- List items: likes grouped per Quest per day ("3 people liked Goa trip"); comments show the commenter's name, photo and the first 80 characters (the live comment; a deleted comment shows "commented on your Quest"); follows show the follower. Tapping opens the Quest (at the comments for comment items) or the profile; fires `notification_opened` with `channel: bell`.
- **Email** (`lib/email/notify.ts`, server only): after the write succeeds, inside `after()`, read the recipient's email (admin client: `auth.users` is not readable otherwise) and settings; send through Resend's HTTP API if the matching switch (`emailOnLike`, `emailOnComment`, `emailOnFollow`) is on. One email per like and per comment, straight away (PRD flow "Notify", S2). Plain, short HTML + text: "Someone liked your Quest {title}", "{name} commented on {title}: "{first 140 chars}"". Link to the Quest with `?n=email` (for `notification_opened`, `channel: email`). Failures are logged by error name only; the like or comment still succeeds.
- **Stop link (S2):** every email has a link and `List-Unsubscribe` / `List-Unsubscribe-Post` headers (one-click, RFC 8058) to `/email/unsubscribe?u={userKey}&k={kind}&t={hmac}` where `t = HMAC-SHA256(EMAIL_LINK_SECRET, userKey + ':' + kind)`. GET shows a one-button confirm page; POST turns that switch off through `save_profile_settings_as_admin` (a service-role-only function that archives + inserts the profile row like `save_profile`). No sign-in needed; the token can only turn one switch off.
- **Sender:** Resend, from `notifications@onquest.in` (SPF, DKIM, DMARC records on onquest.in). The same Resend account becomes Supabase Auth's SMTP for the magic-link option on the sign-in screen (spec A, decision F-A8).

### 3.6 Counting views (PRD questions answered)

- **Once per browser:** `anon_id` (spec A §3.9) is a random id in `localStorage`. `quest_viewed` fires once per page open, after the page is visible, with `quest_id` (key), `is_owner`, `signed_in`, `referrer` (`whatsapp`, `instagram`, `other`, from `document.referrer` and `?utm_source` on our share links) and the common properties. Unique viewers = distinct `anon_id` on `quest_viewed` with `is_owner = false`, in PostHog.
- **Link-preview bots stay out:** WhatsApp, Instagram, Facebook, Telegram, iMessage and search crawlers fetch HTML and never run our JavaScript, so they never fire the event. As a second guard, `track()` drops events when `navigator.webdriver` is set or the user agent matches a short bot list (`lib/analytics/bots.ts`). PostHog's own bot filtering stays on.
- **Linking a viewer to their account:** the same `anon_id` is kept after sign-in and `posthog.identify(userKey)` merges the two, so a person's views before and after signing in count once.
- **For the OnQuest team only:** nothing about views is stored in our database or returned by any function or screen.
- `quest_view_ended` (`seconds`, `pages_seen`, …) is sent on `pagehide`/`visibilitychange` with the beacon transport. Median time spent comes from it.
- Server events are the source of truth for counted things the database also knows (likes, comments, publishes); views are the exception, accepted because the PRD asks for signed-out viewers and storing per-view rows would cost writes on every page open of a cached page.

### 3.7 Instagram export (M17)

- `Template` gains `StoryFrame` (one 1080×1920 image: cover photo, title, dates, and the link as text, e.g. "onquest.in/@riya/goa-trip") and `CarouselFrames` (1080×1350 each: the cover, then one per page, each with the link in the footer). Pixel sizes, pure, built from `templates/shared` pieces.
- `features/export/`: `ExportScreen` at `/quests/[key]/export` (owner, published only) shows the story and carousel scaled down; "Download" renders each frame off-screen with `modern-screenshot` (`domToJpeg`, quality 0.92), one at a time (iOS memory), after `document.fonts.ready` and `img.decode()`. Images come from the private `export.jpg` via signed URLs (1 hour) fetched to blob URLs (no tainted canvas), falling back to `display.webp` when a photo has no export file (old photos or an upload still running).
- Delivery: `navigator.share({ files })` when `navigator.canShare` accepts files (iOS and Android save to Photos or share to Instagram), else one download per image. No ZIP in the MVP (fewer dependencies; ≤ 7 images).
- Reachable from the share screen (spec A), the ⋯ menu (spec C) and the Quest page for its owner.

## 4. Contract

### 4.1 Data shapes

`templates/types.ts` (changed):

```ts
export type Template = {
  id: string;
  name: string;
  status: 'live' | 'coming-soon';
  defaults: { title: string; closingHeadline: string };
  theme: Theme;
  TripPage: (props: { trip: TripData }) => ReactNode;          // now a paged Quest
  StoryFrame: (props: { trip: TripData }) => ReactNode;        // 1080×1920
  CarouselFrames: (props: { trip: TripData }) => ReactNode[];  // 1080×1350 each
};
```

`lib/social/schema.ts` (new):

```ts
export const CommentSchema = z.object({
  key: z.uuid(),
  body: z.string(),
  savedAt: z.string(),
  author: z.object({ key: z.uuid(), handle: z.string(), name: z.string(), avatarUrl: z.string().optional() }),
});
export const QuestSocialSchema = z.object({
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  commentsOn: z.boolean(),
  comments: z.array(CommentSchema).max(100), // [] when comments are off
});
export const ViewerStateSchema = z.object({
  signedIn: z.boolean(),
  liked: z.boolean(),
  isOwner: z.boolean(),
  followingOwner: z.boolean().default(false), // filled by spec C
});
export const NotificationItemSchema = z.object({
  key: z.uuid(),
  kind: z.enum(['like', 'comment', 'follow']),
  savedAt: z.string(),
  unread: z.boolean(),
  likeCount: z.number().int().optional(),          // grouped likes
  actor: z.object({ handle: z.string(), name: z.string(), avatarUrl: z.string().optional() }).optional(), // never for likes
  quest: z.object({ key: z.uuid(), title: z.string(), path: z.string(), coverThumb: z.string().optional() }).optional(),
  commentExcerpt: z.string().max(80).optional(),
});
export const COMMENT_MAX = 300;
```

`lib/cacheTags.ts`: add `tripSocialTag = (tripKey: string) => \`trip-social:${tripKey}\``.

### 4.2 Server actions and route handlers

| Action | Input (zod) | Result data | Errors (in data) | Cache tags |
|---|---|---|---|---|
| `setLike` (`features/trip-page/actions.ts`) | `{ tripKey: uuid, liked: boolean, source: enum(quest_page, fullscreen, feed, after_sign_in) }` | `{ liked, likeCount }` | `not_visible` | `trip-social:{key}` |
| `postComment` | `{ tripKey, body: 1–300 trimmed }` | `{ posted: true, comment: Comment }` | `comments_off`, `not_visible`, `too_fast` | `trip-social:{key}` |
| `deleteComment` | `{ commentKey: uuid }` | `{ deleted: true }` | `not_owner`, `not_found` | `trip-social:{key}` |
| `markNotificationsSeen` (`features/notifications/actions.ts`) | `{ until: string }` | `{ seenUntil }` | — | — |
| `getExportUrls` (`features/export/actions.ts`) | `{ tripKey }` | `{ photos: { id, url }[] }` signed 1 h, `display` URL when no export file | `not_owner` | — |

`source` is used for the `quest_liked` server event only.

| Route handler | Method | Returns | Cache |
|---|---|---|---|
| `app/api/quests/[key]/me/route.ts` | GET | `ViewerState` | `no-store`; never cached by CDN |
| `app/api/notifications/unread/route.ts` | GET | `{ unread: number }` | `no-store`; 401 → `{ unread: 0 }` |
| `app/email/unsubscribe/route.ts` | GET (confirm page) / POST (one-click) | HTML / 200 | `no-store` |

Loaders: `features/trip-page/getQuestSocial.ts` (cached, tag `trip-social:{key}`, public client), `features/trip-page/getQuestStatus.ts`, `features/notifications/getNotifications.ts` (dynamic).

### 4.3 Public reads (new database functions)

| Function | Args | Returns | Granted to |
|---|---|---|---|
| `get_trip_social` | `p_trip_key uuid` | `{ like_count, comment_count, comments_on, comments: [{key, body, saved_at, author: {key, handle, name, avatar_url}}] }`, null when the Quest isn't published public/unlisted | anon, authenticated |
| `get_trip_status` | `p_handle text, p_slug text` | `'private' \| 'removed' \| null` (never Quest data) | anon, authenticated |
| `get_my_quest_state` | `p_trip_key uuid` | `{ liked, is_owner }` | authenticated |
| `set_like` | `p_trip_key uuid, p_liked boolean` | `{ liked, like_count }` | authenticated |
| `post_comment` | `p_trip_key uuid, p_body text` | `{ key, saved_at }` | authenticated |
| `delete_comment` | `p_comment_key uuid` | void | authenticated |
| `list_my_notifications` | `p_limit int (≤ 50), p_before text` | items as `NotificationItemSchema` (snake case) | authenticated |
| `count_unread_notifications` | — | int | authenticated |
| `mark_notifications_seen` | `p_until text` | text | authenticated |
| `save_profile_settings_as_admin` | `p_key uuid, p_settings jsonb` | text | service_role only |

`get_trip`, `get_profile`, `list_sitemap_trips`: unchanged by this spec. The public-function list in CLAUDE.md and `docs/03` §B.2 grows by `get_trip_social` and `get_trip_status` (CLAUDE.md edit is for a human, see C-A10).

A Quest key is random and only reachable through its URL, feeds (public Quests only) or analytics, so `get_trip_social` by key reveals no more than the page itself.

### 4.4 Routes

| Route | Server/client | Loader | Metadata | Index | Sitemap |
|---|---|---|---|---|---|
| `/@handle/slug` (changed) | server + client islands | `getTrip`, `getQuestSocial`, `getQuestStatus` | existing `tripMetadata`; private/removed: title only | per §3.2 | public ≥ 80 words (existing) |
| `/@handle/slug/opengraph-image` (new) | server | `getTrip` | — | — | — |
| `/notifications` | server + client | `getNotifications` | "Notifications" | noindex | no |
| `/quests/[key]/export` | server + client | `getQuestDraft` (published document) | "Download for Instagram" | noindex | no |
| `/email/unsubscribe` | route handler | — | — | noindex | no |

## 5. Database and storage

Migration `20261110000010_reactions.sql` (B-01):

- `likes (key uuid pk, trip_key uuid not null, user_key uuid not null, saved_at, saved_by, save_reason, unique (trip_key, user_key))`, `likes_archive` (+ `archived_at`), index `likes (trip_key)`.
- `comments (key, trip_key, author_key, body text check (char_length(body) between 1 and 300), saved_at, saved_by, save_reason)`, `comments_archive`, index `comments (trip_key, saved_at)`.
- `notifications (key, recipient_key, kind check in ('like','comment','follow'), actor_key null, trip_key null, comment_key null, saved_at)`, index `(recipient_key, saved_at desc)`. Insert-only, no archive (rows never change).
- `notification_reads (key = user key, seen_until timestamptz, saved_at, saved_by, save_reason)`, `notification_reads_archive`.
- Foreign keys to `trips.key` and `profiles.key`: `on delete no action deferrable initially deferred` (spec A §5 rule), so a Quest or profile save never touches likes or comments.
- `delete_trip` replaced (`create or replace`) to delete the trip's likes, comments, their archives and notifications before the trip rows. Spec C's `delete_account_data` deletes everything a user wrote on other people's Quests.
- RLS on every table. `likes`: select own (`user_key = auth.uid()`). `comments`: no direct select (read through `get_trip_social`). `notifications`, `notification_reads`: select own. Archives: select own. No insert/update/delete grants: writes only via functions.
- **What each action archives:** unlike → `likes_archive`; comment delete → `comments_archive`; opening the bell → `notification_reads_archive`. Trip delete and account delete hard-delete live and archived rows.
- **Database tests:** `likes.test.ts` (one per person, idempotent, unlike archives, re-like doesn't notify twice, private Quest can't be liked by others, no liker identity anywhere in owner-readable data); `comments.test.ts` (comments off blocks and hides, only owner deletes, rate limit, draft Quest can't be commented); `notifications.test.ts` (recipient only, unread count, seen moves forward only); `questStatus.test.ts` (private, removed, unknown; no data leaked); `tripDelete.test.ts` extended (likes, comments, notifications gone; a save keeps them).
- **Storage:** none new. `getExportUrls` signs `exports/{userId}/{tripKey}/{photoId}/export.jpg` (owner-only bucket, existing policy).

## 6. Frontend

| Piece | Where | States and rules |
|---|---|---|
| `QuestPlayerProvider`, `QuestPages`, `toQuestPages` | `templates/shared/` | cover → pages → route → cover; tap zones, swipe, keys; reduced motion; no empty pages |
| Beach paged pages | `templates/beach/CoverPage.tsx`, `PhotoPage.tsx`, `RoutePage.tsx`, `TripPage.tsx`, `beach.module.css` | 1/2/3-photo layouts; missing caption/title/date → not rendered; old long days → continuation pages |
| Mountain | `templates/mountain/*` | same contract, own `theme.ts`, `fonts.ts` (5 next/font fonts), assets |
| `StoryFrame`, `CarouselFrames` | `templates/{beach,mountain}/exportFrames.tsx` | px sizes; link text from `trip.url` without `https://` |
| `QuestFullscreen` | `features/trip-page/` | counter "2 / 6" (position among all pages, cover and route included), close, like; Escape; returns to the same page; uses the Fullscreen API when available, a fixed overlay otherwise (iPhone Safari) |
| `QuestByline`, `LikeButton`, `QuestSocial`, `CommentList`, `CommentComposer`, `MakeYourOwnBar`, `QuestUnavailable` | `features/trip-page/` | like: optimistic, rolls back on error; < 3 likes copy (F-B1); comments newest last, owner sees Delete on each with Undo toast; composer 300 chars with counter near the limit; off state copy; sign-in intents; private/removed copy |
| `NotificationsView`, `BellBadge` | `features/notifications/` | empty: "No notifications yet. Share your Quest to get likes and comments."; loading skeleton; error with Retry; unread dots |
| `ExportScreen` | `features/export/` | preview; rendering progress ("Making image 3 of 6…"); share/download; error "Couldn't make the images. Try again." |

App chrome uses `design-system/` only; templates never import it (decision 0002). Inside the Quest page the template's palette wins; the byline, social section and sticky bar are app chrome (design system).

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| New tables: RLS, owner-only, db test | Yes | §5 |
| No anonymous `select` policy | Yes | Public reads only via `get_trip_social`, `get_trip_status` |
| No `UPDATE` (0001) | Yes | Unlike and comment delete archive; reads mark is archive + insert; notifications insert-only |
| No `dangerouslySetInnerHTML` with user text | Yes | Comments rendered as text; email HTML built with an escaping helper (`lib/email/escape.ts`) |
| Don't log user text, emails, photo URLs | Yes | `notify.ts` logs kind + error name only; Resend payloads never logged |
| Secret key only in `lib/supabase/admin.ts` | Yes | `notify.ts` and the unsubscribe route import the admin client from there; `RESEND_API_KEY`, `EMAIL_LINK_SECRET` server-only |
| Likes anonymous; view counts team-only | Yes | §3.3, §3.6 |
| Private Quest leaks | Yes | `get_trip_status` returns a word, not data; `get_trip_social` null for private |
| Spam | Partly | One like per person; 5 comments per minute; reporting and blocking are out of scope (PRD) |
| Unlisted URLs in emails/analytics | Yes | Emails go only to the owner; analytics use the key, not the path |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content` | None new | — | — |
| Existing trip rendering | Beach becomes paged; days with > 3 photos become continuation pages | Accepted: no real users, PRD replaces v1. `jitter` keys and algorithm unchanged | Old-shape fixture (6 days, 20 photos on one day, no captions) renders every photo, no empty boxes |
| Public functions | Two new; existing unchanged | — | existing `access.test.ts` |
| Public URLs | Unchanged; private and removed now show messages instead of 404 | — | `questStatus.test.ts` |
| Template contract | `StoryFrame`, `CarouselFrames` become required | Beach and Mountain both implement them in the same release | typecheck |
| Storage | None | — | — |
| Env vars | `RESEND_API_KEY`, `EMAIL_LINK_SECRET`, `EMAIL_FROM` | `.env.example`; email skipped (logged once) when unset, so preview works without them | `notify.test.ts` |

**Deploy order:** migration 10 before B's backend code (the code calls its functions); migration 10 is additive, so the previous release keeps working after it runs.

## 9. Performance and cost

- Quest page: cached HTML; cover image `priority` with `display` srcset, other pages' images lazy; MapLibre only near the route page; social section streamed. Target LCP < 2.5 s on mid Android 4G (HLD §8).
- One extra no-store request per view (`/me`, ~1 KB); the cached social fetch revalidates only on writes.
- Polling: one tiny request per signed-in open tab every 30 s.
- **Resend:** the free plan allows 3,000 emails a month but only 100 a day; a busy friends test with an email per like can pass 100 in a day. Pro is $20/month (50,000). Decided: start free, upgrade only if needed (C-B3).
- Export: on the phone; no server cost.

## 10. Analytics

Per the Taxonomy sheet: `quest_viewed`, `quest_view_ended`, `quest_page_turned`, `quest_fullscreen_toggled`, `quest_liked` (server; `source`: quest_page / fullscreen / feed / after_sign_in; `unlike`), `comment_posted` (server), `make_your_own_tapped` (`signed_in`), `sign_in_started` (`source`: like / comment / make_your_own), `notification_sent` (server; `kind`, `channel`: bell / email), `notifications_viewed`, `notification_opened` (`channel`: bell / email), `instagram_export_downloaded` (`format`), `quest_link_shared` (from the Quest page share). No comment text, no email addresses.

## 11. Test plan

- **Unit:** `pages.test.ts` (`toQuestPages`: 3 photos, 15 photos, old 20-photo day, no places → no route page); `questPlayer.test.tsx` (loop, tap zones, keys); `questFullscreen.test.tsx`; `LikeButton.test.tsx` (copy below 3, optimistic rollback); `notify.test.ts` (switch off → no email; escaping; no log of address); `unsubscribe.test.ts` (bad token refused; good token turns one switch off); `bots.test.ts`; `meRoute.test.ts`.
- **Database:** §5.
- **Backward compatibility:** old-shape fixture through both templates.
- **Playwright (B-11):** create → publish → open signed out → export one frame of 1080×1920. Uses a local-only test sign-in (seeded email/password user, route enabled only when `E2E=1` and never in production builds).
- **Human UX test:** PRD tasks 4 and 5, on the preview build with two phones.

## 12. Tasks

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| B-01 | Backend | Migration 10: likes, comments, notifications, reads, status + social functions | `supabase/migrations/20261110000010_reactions.sql`, `tests/db/{likes,comments,notifications,questStatus,tripDelete}.test.ts`, `lib/supabase/database.types.ts` | M8, M10, M13, M14, M16, spam | A-03 | §5 tests pass; save keeps children, delete removes them |
| B-02 | Frontend | Quest player + Beach as a paged Quest, on sample data | `templates/shared/questPlayer.tsx`, `templates/shared/pages.ts` (+ tests), `templates/beach/*`, `lib/demo/sampleQuests.ts` (3-photo, 15-photo, old-shape fixtures), `app/(public)/demo/page.tsx` | M7, M9 | — (**now**) | `/demo` plays cover → pages → route → cover with the three fixtures; no empty boxes |
| B-03 | Frontend | Quest page chrome on sample data | `features/trip-page/{QuestFullscreen,QuestByline,LikeButton,QuestSocial,CommentList,CommentComposer,MakeYourOwnBar,QuestUnavailable}.tsx` (+ tests), `features/trip-page/TripView.tsx`, `lib/demo/sampleSocial.ts` | M9, M10, M11, M12, M14, S3 | B-02, A-08 (**now**) | Every state in §6 visible on `/demo` with fixture data |
| B-04 | Frontend | Mountain template | `templates/mountain/*`, `templates/registry.ts` | M6 | B-02 (**now**) | Small (3 photos, no text) and big (15 photos, all captions; old 60-photo fixture) trips look finished |
| B-05 | Backend | Reaction actions, loaders, viewer-state route, Quest states | `features/trip-page/actions.ts`, `getQuestSocial.ts`, `getQuestStatus.ts`, `getTrip.ts` (status fallback), `app/api/quests/[key]/me/route.ts`, `features/export/actions.ts`, `lib/social/schema.ts`, `lib/cacheTags.ts` (+ tests) | M8, M10–M12, M14, M16 | B-01, A-04 | Contract §4.2 exact; tags refreshed; me-route never cached |
| B-06 | Backend | Notifications loaders + email | `features/notifications/{actions,getNotifications}.ts`, `app/api/notifications/unread/route.ts`, `lib/email/{notify,resend,escape,links}.ts` (+ tests), `app/email/unsubscribe/route.ts`, `lib/supabase/admin.ts` (if not yet present), `.env.example`, `docs/runbooks/email.md` (DNS + Supabase SMTP steps) | M13, M26 (emails), S2 | B-01, A-02 | Like and comment emails sent once each, respecting switches; unsubscribe works without sign-in |
| B-07 | Frontend | Wire the Quest page | `features/trip-page/*` (wiring), `features/trip-page/useViewerState.ts`, `useQuestIntent.ts`, `app/(public)/u/[handle]/[slug]/page.tsx`, `opengraph-image.tsx`, `features/trip-page/metadata.ts` | M8–M12, M14, M16 | B-03, B-05, A-06 | UX task 4 passes on the preview build |
| B-08 | Frontend | Notifications screen + bell badge | `features/notifications/{NotificationsView,BellBadge}.tsx`, `app/(app)/notifications/page.tsx` | M13 | A-08 (**now** on fixtures); wiring after B-06 | Unread count updates within 60 s; opening marks seen |
| B-09 | Frontend | Instagram export | `templates/{beach,mountain}/exportFrames.tsx`, `templates/types.ts`, `features/export/*`, `app/(app)/(create)/quests/[key]/export/page.tsx`, `package.json` (`modern-screenshot`) | M17 | B-02, B-04 (**now** on fixtures), B-05 for signed URLs | 5-page Quest → 1 story + 6 carousel images with the link; saves on iPhone and Android |
| B-10 | Frontend | Viewer and reaction events | `features/trip-page/*`, `features/notifications/*`, `features/export/*` (track calls), `lib/analytics/bots.ts` (+ test) | analytics | A-07, B-07 | §10 events valid against the taxonomy schema |
| B-11 | Frontend | Playwright smoke test | `e2e/smoke.spec.ts`, `playwright.config.ts`, `app/(auth)/e2e-login/route.ts` (E2E-only), `supabase/seed.sql` (test user), `.github/workflows/ci.yml` (job) | create → publish → view → export | A-13, B-07, B-09 | Runs in CI against local Supabase; e2e route returns 404 unless `E2E=1` |

## 13. Decisions

| Decision | Options considered | Choice | Reason | CTO sign-off? |
|---|---|---|---|---|
| Social data caching | In `get_trip` (rebuild page per like); separate cached loader; fully client-side | Separate loader, tag `trip-social:{key}`, server-rendered | Comments in HTML, cheap likes | Yes (C-B2) |
| Like/follow writes | `saved_at` conflict check; idempotent set-state | Idempotent set-state | Nothing to overwrite; repeated taps safe | Yes (C-B1) |
| Bell freshness | Supabase Realtime; polling | 30 s polling | Simple, meets "within 1 minute" | No |
| Views | DB table; PostHog only | PostHog only | PRD: team-only numbers; no write per view | Yes (C-A8) |
| Export delivery | ZIP; share sheet + single downloads | Share sheet, else downloads | ≤ 7 images; one less dependency | No |
| Private/removed status code | 404 with custom body; 200 + noindex | 200 + noindex | Next `notFound()` can't vary the message per URL | Yes (C-B5) |

## 14. Risks and open questions

### Decisions needed

**Founder**

- **F-B1. Like count below 3.** The PRD hides the count under 3 and shows "Be the first to like this", but M10 expects the count to go up by 1 after a friend's like. Recommended: 0 likes → "Be the first to like this"; 1–2 likes → just the filled heart and "Liked" for the person who liked it, no number; 3+ → the number. M10's check is then run on a Quest with 3 or more likes.
- **F-B2. Follow notifications.** Recommended: yes, a bell item and an email for a new follower, with the "follows me" email switch already in Settings (the PRD lists this as open).
- **F-B3. Search engines.** Quests are indexed only with 80+ words of text (`docs/03` §C.1). With 60-character captions most Quests stay out of Google. Keep (safer for site quality), or index every public Quest with at least 3 captions?

**CTO**

- **C-B1.** Likes (and C's follows) are idempotent set-state functions with no `saved_at` check, an exception to 0001 rule 4; unlike/unfollow archive the row.
- **C-B2.** Social data (likes, comments) is cached separately under `trip-social:{key}` so a like never rebuilds the Quest page.
- **C-B3. Decided 10 Nov (CTO):** Resend free plan (100 emails a day, 3,000 a month) for the founders' and friends tests; move to Pro ($20/month, 50,000 a month, no daily cap) only if emails pass 100 a day. DNS records (SPF, DKIM, DMARC) on onquest.in, added in Hostinger. Resend is also Supabase Auth's SMTP for magic links. Not a Hostinger mailbox: mailbox SMTP isn't meant for automated app email and risks sign-in links landing in spam.
- **C-B4.** Email links use an HMAC token with no expiry that can only turn one email switch off. New secret `EMAIL_LINK_SECRET`.
- **C-B5.** Private and removed Quest pages answer 200 with `noindex` and a message; unknown URLs stay 404.

### Technical risks

- iPhone Safari has no element full-screen API: the overlay fallback must hide Safari's bars as far as possible (`100dvh`, `viewport-fit=cover`).
- `modern-screenshot` with `clip-path` torn edges and self-hosted fonts on iOS: the LLD's export spike was never done; B-09 starts with it.
- Email deliverability from a new domain: warm up with the founders' test.

## 15. Later

Author deleting their own comment; comment reporting and blocking; Realtime bell; push notifications; daily like digests; per-page reactions (PRD risk fallback); private bucket with signed URLs for private Quests; ZIP export; server-side export rendering.
