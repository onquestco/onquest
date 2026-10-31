# OnQuest MVP: Product + Tech PRD (v2)

Product name: **OnQuest** (`onquest.in`). Written to be handed to Claude Code as the build spec. Attach the "My Goa Trip" HTML alongside it; it is the reference implementation for the Beach template.

---

## 1. What we're building

**A home on the web for all your trips.** Every traveler gets a public profile (think LinkedIn, but for travel) that collects all their journeys. Each trip is a beautiful, interactive scrapbook page like the Goa reference: polaroids, torn paper, stamps, a map of places, day-by-day story, tap-to-open memories.

From the same trip, users also get **Instagram Stories and carousel posts** in the matching scrapbook style. Instagram is how people discover us; the website is where the memories live.

```
Profile (/@swati)  ── all trips, places map, travel stats
   └── Trip memory page (/@swati/goa-2026) ── the Goa-style scrapbook
          └── Instagram exports ── stories + carousel, link back to the page
```

## 2. Why

- After a trip, people have great photos and nowhere good to put them. Instagram mixes travel with everything else and isn't a keepsake; Google Photos albums are ugly to share.
- A beautiful link ("see my Goa trip") is something people love sending on WhatsApp, and every Instagram export carries the handle/link back.
- Over time the profile becomes the user's travel identity: every place they've been, every trip, in one shareable page. That's the retention and the "LinkedIn for trips" layer.

## 3. Users

**Primary:** 18–30 year olds who travel a few times a year, care about how their memories look, already pick their favourite photos, and don't want to design anything.

**Secondary:** friends and family who receive the link (viewers, no account needed). Every viewer is a potential creator.

## 4. Product pieces

### 4.1 Trip memory page (core)

A hosted, interactive page per trip, rendered from a template + the user's trip data. Sections, matching the Goa reference:

1. **Opening spread** – story-card collage: trip title in script font, short name, dates, stats ("5 days · 7 places · 1 journey"), traveler name/avatar, hero photos.
2. **Where I went** – map with a pin per place; tap a pin → memory sheet for that place (photo, text, "see it on the map").
3. **Day by day** – swipeable rail of day cards (day number, title, place tags, quote, story, 3 photos); tap a photo → sheet with photo carousel, caption, story, tags.
4. **Favourites** – the user's top 3 places.
5. **Closing note** – a short reflection paragraph + closing spread.
6. **Footer** – "Made with OnQuest · Make your own" CTA (growth loop) + link to traveler's profile.

Visibility per trip: **public** (on profile), **unlisted** (link only), **private** (only owner).

### 4.2 Traveler profile ("LinkedIn for trips")

`/@handle`:
- Name, avatar, short bio, home city.
- **Travel stats:** trips, places, cities/countries visited, days travelled.
- **All-places map:** every pin from every public trip.
- **Trip grid:** cover card per trip (title, place, dates, template style), newest first.
- Share profile button.

### 4.3 Instagram exports (distribution)

Generated from the same trip data, in the trip's template style:
- **Carousel post** (1080×1350): cover, day/place slides, outro. 5–10 slides.
- **Story frames** (1080×1920): 3–5 frames; last frame says "Full trip at onquest.in/@handle/…" (users add Instagram's link sticker themselves).
- Share via native share sheet, or download ZIP / single image.
- Watermark: deferred, not in v1 for now.

### 4.4 Later (not v1, but design for it)

Follow travelers, feed of friends' trips, likes/comments ("been there" reactions), discovery by place ("everyone's Goa trips"), collaborative trips (friends add photos to one trip), print a physical scrapbook, AI story writing from photos, Google Photos import.

## 5. Scope for v1

**In:**
- Sign up / log in (Google + email magic link), pick a handle.
- Create a trip: template → photos → days → places → words → preview → publish.
- Trip memory page (Beach template first, Mountain second).
- Profile page with stats, all-places map, trip grid.
- Edit trip after publishing; delete trip.
- Visibility: public / unlisted / private.
- Instagram exports (carousel + stories).
- Rich link previews (Open Graph image) for trip and profile URLs, so WhatsApp/Instagram DMs show a pretty card.
- Analytics + feedback prompt.

**Out (v1):**
- Follow, feed, likes, comments, notifications.
- Freeform drag-and-drop editor (templates are slot-based; see §6).
- Multiple contributors per trip.
- AI selection from huge dumps, AI-written stories.
- Video, Reels, native apps.

## 6. How templates work

Templates are **designed by the co-founder, implemented as code + data**. Users never touch a blank canvas: they fill slots and the template makes it look good.

### 6.1 Each template provides

- **Theme:** palette, fonts, paper texture, decorative assets (stamps, tape, doodles, stickers, airmail borders).
- **Memory page components:** OpeningSpread, MapSection, DayRail, DayCard, MemorySheet, Favourites, ClosingSpread, Footer.
- **Spread layouts:** collage arrangements for opening/closing spreads, defined as slots (position %, width %, rotation, aspect ratio, frame style, z-index, animation delay). The Goa HTML already uses this exact pattern (`sc({k,x,y,w,r,ar,d,z,p,c})`) – port it.
- **Instagram layouts:** fixed-pixel frame layouts with photo/text/decor slots (§8).

### 6.2 Slot definition

```ts
type PhotoFrame = 'polaroid' | 'torn' | 'taped' | 'stamp' | 'airmail' | 'plain';

type Slot =
  | { type: 'photo'; id: string; x: number; y: number; w: number; ar: number;
      rotate?: number; frame: PhotoFrame; z?: number; delay?: number;
      source: PhotoSource }               // which photo fills it, see below
  | { type: 'text'; id: string; x: number; y: number; w?: number;
      role: 'script' | 'type' | 'hand' | 'serif' | 'sans' | 'strip';
      bind: TextBinding; maxChars?: number; rotate?: number; z?: number }
  | { type: 'decor'; id: string; asset: string; x: number; y: number; w: number;
      rotate?: number; z?: number };

type PhotoSource = 'cover' | 'favourite:0' | 'favourite:1' | 'favourite:2'
                 | `day:${number}:${number}` | 'auto';
type TextBinding = 'title' | 'short' | 'dates' | 'stats' | 'traveler'
                 | 'note' | `day:${number}:title` | `day:${number}:quote` | 'custom';
```

Positions in the memory page are percentages of the stage (stages use container units like the reference, so they scale on any screen). Instagram frames use pixels at 1080 width.

### 6.3 Making messy real data look good

Templates must handle: 3 photos or 60; 1 day or 14; portrait vs landscape; missing text. Rules:
- Every text field has a sensible default or the element is hidden (no empty boxes).
- Photo slots prefer orientation-matching photos.
- Seeded randomness for small rotations and decor jitter, stored per trip so the page looks the same on every visit. "Shuffle" picks a new seed.
- Max chars enforced in the editor for each text slot.

## 7. Creation flow (mobile-first)

1. **Pick a template** – Beach / Mountain (City, Monsoon "coming soon").
2. **Add photos** – multi-select from gallery (target 10–60). Compressed on device, uploaded in background with progress.
3. **Days** – photos auto-grouped by EXIF date into days. User can drag photos between days, merge/split days. No EXIF → single day, user can add days.
4. **Places** – auto-suggested from photo GPS (reverse geocode), else search box. Each place: name, pin, one photo, a line of text. User confirms or removes pins (nothing is placed on the map without confirmation).
5. **Words** (all optional, skippable) – trip title (template default like "Salt in the Air, Sand in My Hair"), short name ("My Goa Trip"), per day: title, quote, short story, photo captions; closing note; pick 3 favourite places. Character counters.
6. **Preview** – the real memory page. Tap any photo or text to edit/swap it. Shuffle button.
7. **Publish** – choose visibility, set URL slug. Get: copy link, share sheet, "Make Instagram posts" button.
8. **Instagram export** – preview carousel + stories, swap photos/text, share/download.

Draft autosaves to the server after each step; user can leave and come back.

## 8. Instagram export rendering

- Frames are React components at native size (1080×1350 / 1080×1920), shown scaled in preview.
- Rasterise in the browser with `modern-screenshot` (or `html-to-image`) → JPEG q≈0.92.
- Before capture: `await document.fonts.ready` and `img.decode()` for every image. Self-host fonts (WOFF2) – do not load Google Fonts at export time.
- Photos must be same-origin or served with CORS headers from storage to avoid tainted canvases.
- Render one frame at a time (iOS memory). Share via `navigator.share({ files })` when `navigator.canShare` supports files; else ZIP (`jszip`) / single download.
- Keep frame components pure so a server renderer (Playwright) can be added later if client rendering fails on some phones.

## 9. Tech stack

| Concern | Choice | Why |
| --- | --- | --- |
| App | Next.js (App Router) + TypeScript on Vercel | SSR for public pages + OG images, one codebase |
| UI styling | Tailwind for app chrome; CSS modules for template components | Templates need precise, hand-tuned CSS |
| Auth, DB, storage | Supabase Pro plan, single project (Postgres, Auth, Storage, RLS) | Fastest for a 2-person team; Pro avoids pausing |
| Images | `browser-image-compression`, `exifr`, `heic2any` fallback; sizes generated on device at upload (see §9.1). Do **not** use Supabase image transformations | Transformations are billed per image |
| Map | MapLibre GL or Leaflet + a styled free tile provider (e.g. MapTiler / Stadia); custom pin markers in template style | Free tier, styleable to match paper look |
| Geocoding / place search | Mapbox or Google Places autocomplete (pick one, behind a `geo.ts` interface) | Quality matters for place names |
| Client state | Zustand for editor | |
| Exports | `modern-screenshot`, `jszip` | |
| OG images | `next/og` (ImageResponse) | Pretty link cards on WhatsApp |
| Analytics | PostHog | Events + simple surveys |

### 9.1 Infra and cost rules

- One Supabase project on the Pro plan (paid from existing credits). No separate staging project for now; use a local Supabase (`supabase start`) for development.
- Spend cap stays **on**.
- On upload, the client creates three versions of every photo and uploads all three:
  - `thumb`: 400px long edge, WebP, ~40 KB (grids, profile cards, editor)
  - `display`: 1600px long edge, WebP, ~250 KB (trip page, memory sheet)
  - `export`: 2160px long edge, JPEG q0.9 (Instagram export source; owner-only access)
- Storage paths: `photos/{owner_id}/{trip_id}/{photo_id}/{thumb|display|export}.{ext}`.
- Serve public images with long cache headers (`cache-control: public, max-age=31536000, immutable`); file names never change, a replaced photo gets a new id.
- Trip pages load `thumb` first and swap to `display` only when an image is near the viewport, to keep bandwidth low.
- All storage access goes through `lib/storage.ts` so photos can move to Cloudflare R2 later without touching the app.

## 10. Data model (Postgres / Supabase)

```sql
profiles (
  id uuid pk references auth.users,
  handle text unique not null,          -- /@handle
  name text, avatar_url text, bio text, home_city text,
  created_at timestamptz default now()
)

trips (
  id uuid pk default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  slug text not null,                   -- unique per owner
  template_id text not null,            -- 'beach' | 'mountain' | ...
  visibility text not null default 'private', -- public | unlisted | private
  status text not null default 'draft', -- draft | published
  title text, short_title text,
  start_date date, end_date date,
  cover_photo_id uuid,
  seed int not null default floor(random()*1e9),
  content jsonb not null default '{}',  -- days, words, favourites, note, overrides
  published_at timestamptz, updated_at timestamptz default now(),
  unique (owner_id, slug)
)

places (
  id uuid pk default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null, lat double precision, lng double precision,
  country_code text, city text,
  photo_id uuid, text text, sort int
)

photos (
  id uuid pk default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  owner_id uuid references profiles(id),
  storage_path text not null,           -- folder; contains thumb/display/export files
  width int, height int, taken_at timestamptz,
  day_index int, sort int, caption text
)
```

`trips.content` mirrors the reference page's `tripData` shape (days with n/title/tags/quote/story/photos, favs, note) using photo/place ids, so the template components can consume it almost unchanged.

**Profile stats** are computed from published public trips + places (count trips, distinct places, distinct cities/countries, sum of days). A view or materialised view is fine.

**RLS:** owners have full access to their rows. Anyone can `select` trips/places/photos where trip is `published` and visibility is `public` or `unlisted` (unlisted not listed on profile, but readable by URL). Storage bucket policies follow the same rule; private trip photos are served via signed URLs.

## 11. Routes

```
/                         landing (demo trip page + CTA)
/login                    auth
/onboarding               pick handle, name, avatar
/new                      create trip wizard (steps as sub-routes or state)
/trips/[id]/edit          edit trip (same wizard + inline editing on preview)
/trips/[id]/export        Instagram export
/@[handle]                public profile        (SSR, OG image)
/@[handle]/[slug]         trip memory page      (SSR, OG image)
/demo                     the Goa sample trip, for showing people
```

## 12. Privacy and safety

- Strip EXIF (especially GPS) from stored public images; keep extracted date/GPS only in our DB, and only use GPS to suggest places the user confirms.
- Map shows place-level pins the user chose, never raw photo coordinates.
- Default visibility for new trips: **unlisted** (shareable by link, not on profile) until the user chooses public.
- Allow deleting a trip and the account (deletes photos from storage).
- Report link on public pages (simple email form) since content is user-uploaded.

## 13. Performance targets

- Trip page LCP < 2.5 s on 4G mid-range Android; images served from the pre-generated thumb/display sizes (§9.1), lazy-load below the fold.
- Upload 30 photos: compression + upload in background, user can continue with days/places meanwhile.
- Instagram export of ~12 frames < 12 s.
- Animations (drop-in scraps) respect `prefers-reduced-motion`.

## 14. Analytics

| Event | Notes |
| --- | --- |
| `signup`, `handle_set` | |
| `trip_started` | templateId |
| `photos_uploaded` | count, hasExif, hasGps |
| `step_completed` | step name – find drop-off |
| `trip_published` | visibility, days, places, wordsFilled% |
| `trip_viewed` | is_owner, referrer (whatsapp/instagram/direct) |
| `profile_viewed` | |
| `cta_make_your_own_clicked` | from trip page footer – viewer → creator loop |
| `export_clicked` / `export_success` / `export_failed` | method, frameKind |
| `feedback_submitted` | |

**Success for the friends test (first 3–4 weeks):**
- ≥ 50% of signups publish a trip.
- Each published trip gets ≥ 5 views from people other than the owner.
- ≥ 30% of publishers export to Instagram and post.
- ≥ 3 new signups who came from someone else's trip page or post.
- Qualitative: people say "I want to do this for my other trips" (profile value).

## 15. Milestones

**Week 1 – Memory page from data**
- Next.js + Supabase setup, schema, RLS, storage buckets.
- Port the Goa HTML into React components driven by a `TripData` object (Beach template). `/demo` renders it from seeded data.

**Week 2 – Create + publish**
- Auth, onboarding/handle, photo upload (compress, EXIF, background upload).
- Wizard: days grouping, places (geocode + confirm), words, preview, publish, visibility.
- Trip page SSR from DB + OG image.

**Week 3 – Profile + Instagram**
- Profile page: stats, all-places map, trip grid.
- Instagram export (carousel + stories) for Beach.
- Inline edit on preview, Shuffle, edit after publish.
- Analytics, feedback, "make your own" footer. Ship to friends.

**Week 4 – Learn and fix**
- Fix friction from real usage; add Mountain template.
- Decide next: social layer (follow/feed) vs more templates vs AI story writing.

## 16. Acceptance criteria (v1)

- [ ] A new user on a phone can sign up, create a 3-day trip with 20 photos and 4 places, and publish it in under 15 minutes (most of it optional writing).
- [ ] Published trip page visually matches the Goa reference quality for the Beach template, on iPhone Safari and Android Chrome.
- [ ] Trip page works with 1 day / 3 photos / no text and with 10 days / 60 photos without broken layouts or empty boxes.
- [ ] Profile shows correct stats, all public trip pins, and trip cards; unlisted/private trips don't appear.
- [ ] Unlisted trips load by URL for logged-out viewers; private trips return 404 for anyone but the owner.
- [ ] Sharing a trip or profile URL on WhatsApp shows a styled preview card.
- [ ] Instagram exports are exactly 1080×1350 / 1080×1920 JPEG, fonts render correctly, share sheet works on iOS + Android with download fallback.
- [ ] Public photos have no GPS EXIF.
- [ ] Drafts autosave; refreshing mid-wizard loses nothing.
- [ ] Deleting a trip removes its photos from storage.

## 17. Open questions for the founders

1. ~~Product name and domain~~ Decided: OnQuest, `onquest.in`, with `/@handle` URLs.
2. Default visibility: unlisted (current spec) or public?
3. How much writing do we ask for? (Current spec: everything optional, template defaults fill gaps.)
4. Second template after Beach.
5. ~~Watermark on Instagram exports~~ Decided: deferred, no watermark for now.
6. Do we show the trip-page "Make your own" CTA to logged-in viewers too?

## 18. Notes for Claude Code

- The attached Goa HTML is the source of truth for the Beach template look and interactions. Its `tripData` object is the shape to target; replace the generated SVG placeholder images (`IMG(...)`) with real photo URLs.
- Build in this order: (1) `TripData` types + Beach memory page rendering `/demo`, (2) Supabase schema + RLS, (3) creation wizard, (4) profile, (5) Instagram export.
- Keep template components pure (props in, markup out) and theme-driven, so adding Mountain is mostly new CSS/assets/layouts, not new logic.
- Abstract geocoding (`lib/geo.ts`) and image storage (`lib/storage.ts`) behind small interfaces.
- Write tests for: day grouping from EXIF, slot filling with too few/too many photos, RLS visibility rules, export dimensions.
