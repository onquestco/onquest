# OnQuest: Low-Level Design (LLD), lean v1

Implements `01-hld.md`. Coding conventions are in `CLAUDE.md`. Security/SEO details are in `03-security-visibility-seo.md`.

Stack: Next.js 16 (App Router), React 19, **TypeScript strict**, Tailwind (app screens) + CSS modules (templates), Supabase (`@supabase/ssr`), Zustand (editor), zod, MapLibre GL, `modern-screenshot`, `jszip`, `exifr`, PostHog, Sentry, Vitest, Playwright.

---

## 1. Folder structure

```
app/                                  routes only, kept thin
  (public)/
    page.tsx                          landing
    demo/page.tsx                     Goa sample from lib/demo-trip.ts
    u/[handle]/page.tsx               profile      (/@handle rewrites here)
    u/[handle]/opengraph-image.tsx
    u/[handle]/[slug]/page.tsx        trip page    (/@handle/slug rewrites here)
    u/[handle]/[slug]/opengraph-image.tsx
  (app)/
    layout.tsx                        redirects to /login if no user
    login/page.tsx
    onboarding/page.tsx
    new/page.tsx
    trips/[id]/edit/page.tsx
    trips/[id]/preview/page.tsx
    trips/[id]/export/page.tsx
    settings/page.tsx
  auth/callback/route.ts
  sitemap.ts
  robots.ts

features/                             one folder per product area
  trip-page/   getTrip.ts  TripView.tsx  metadata.ts  jsonLd.ts  OwnerBar.tsx
  profile/     getProfile.ts  ProfileView.tsx  TripGrid.tsx  StatsRow.tsx  metadata.ts
  editor/      store.ts  actions.ts  upload.ts  image.worker.ts  groupDays.ts  suggestPlaces.ts
               steps/  TemplateStep.tsx PhotosStep.tsx DaysStep.tsx PlacesStep.tsx WordsStep.tsx PublishStep.tsx
  export/      ExportView.tsx  renderFrame.ts  share.ts
  account/     actions.ts  HandleForm.tsx  DeleteAccount.tsx

templates/
  types.ts                            Template, Theme
  registry.ts                         { beach, mountain }
  shared/      Photo.tsx Stage.tsx Text.tsx Sticker.tsx MemorySheet.tsx DayRail.tsx MapSection.tsx
               Footer.tsx pickPhotos.ts jitter.ts
  beach/       index.ts theme.ts TripPage.tsx OpeningSpread.tsx FavouritesSpread.tsx DayCard.tsx
               ClosingSpread.tsx frames/StoryFrames.tsx frames/CarouselFrames.tsx beach.module.css assets/

lib/
  supabase/browser.ts  supabase/server.ts  supabase/admin.ts     (admin = secret key, 'server-only')
  trip/schema.ts       zod schemas + inferred types for stored data
  trip/types.ts        TripData (what templates render)
  trip/toTripData.ts   DB rows → TripData
  action.ts            tiny wrapper for server actions (auth + zod + errors)
  storage.ts           every bucket path and storage call
  geo.ts               search + reverseGeocode, one provider behind it
  dates.ts             formatDateRange
  slug.ts              slugify + unlisted suffix
  analytics.ts         typed track()
  demo-trip.ts         Goa sample data

supabase/migrations/*.sql   supabase/seed.sql
tests/db/*.test.ts          (Vitest against local Supabase)
tests/e2e/smoke.spec.ts     (Playwright)
public/fonts/*.woff2
proxy.ts   next.config.ts   CLAUDE.md
```

Dependency direction (enforce in review; optionally with `eslint-plugin-boundaries`):

```
app → features → templates → lib
                 features  → lib
```

`templates/` never imports from `features/`. `lib/` imports nothing from the app.

`next.config.ts`:

```ts
async rewrites() {
  return [
    { source: '/@:handle', destination: '/u/:handle' },
    { source: '/@:handle/:slug', destination: '/u/:handle/:slug' },
  ];
}
```

---

## 2. Data shapes

### 2.1 Stored trip content (`lib/trip/schema.ts`)

zod is the single source of truth. Types come from `z.infer`.

```ts
export const DaySchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(40).optional(),
  quote: z.string().max(60).optional(),
  story: z.string().max(500).optional(),
  placeIds: z.array(z.string().uuid()).max(6),
  photoIds: z.array(z.string().uuid()).max(40),
});

export const TripContentSchema = z.object({
  destination: z.string().max(30).optional(),     // "Goa"
  note: z.string().max(600).optional(),
  closingHeadline: z.string().max(40).optional(),
  favourites: z.array(z.string().uuid()).max(3),  // place ids
  days: z.array(DaySchema).max(30),
});

export type TripContent = z.infer<typeof TripContentSchema>;
export type DayContent = z.infer<typeof DaySchema>;
```

Captions live in `photos.caption` only.

### 2.2 What templates render (`lib/trip/types.ts`)

```ts
export type Photo = { id: string; thumb: string; display: string; width: number; height: number; caption?: string };
export type Place = { id: string; name: string; lat: number; lng: number; note?: string; photo?: Photo };
export type Day   = { number: number; title: string; quote?: string; story?: string; places: Place[]; photos: Photo[] };

export type TripData = {
  id: string;
  templateId: TemplateId;
  url: string;
  seed: number;
  traveler: { name: string; handle: string; avatar?: Photo };
  title: string;            // always set (template default if empty)
  shortTitle: string;       // always set ("My Goa Trip")
  destination?: string;
  dateLabel?: string;       // "12 – 16 February"
  statsLabel: string;       // "5 days · 7 places", computed
  cover?: Photo;
  photos: Photo[];          // all, in order
  places: Place[];
  favourites: Place[];
  days: Day[];
  note?: string;
  closingHeadline: string;  // always set
};
```

`toTripData(rows, template)` is the only place defaults are applied. Templates check `if (trip.note)` for optional parts and never deal with raw DB rows.

### 2.3 Template contract (`templates/types.ts`)

```ts
export type TemplateId = 'beach' | 'mountain';

export type Theme = {
  colors: Record<'bg' | 'ink' | 'accent' | 'accent2' | 'paper', string>;
  dayBackgrounds: string[];             // cycled: dayBackgrounds[i % length]
  fonts: { script: string; type: string; hand: string; serif: string; sans: string };
};

export type Template = {
  id: TemplateId;
  name: string;
  status: 'live' | 'coming-soon';
  defaults: { title: string; closingHeadline: string };
  theme: Theme;
  TripPage: (props: { trip: TripData }) => React.ReactNode;
  StoryFrames: (props: { trip: TripData }) => React.ReactNode[];     // 1080×1920 each
  CarouselFrames: (props: { trip: TripData }) => React.ReactNode[];  // 1080×1350 each
};
```

```ts
// templates/registry.ts
import beach from './beach';
import mountain from './mountain';
export const templates: Record<TemplateId, Template> = { beach, mountain };
export const getTemplate = (id: TemplateId) => templates[id];
```

### 2.4 Shared template pieces

```tsx
// templates/shared/Photo.tsx — one component for every scrapbook photo
type Props = {
  photo: Photo;
  frame: 'polaroid' | 'torn' | 'circle' | 'plain';
  x: number; y: number; width: number;    // % of the Stage
  aspect?: number; rotate?: number; z?: number;
  label?: string; tape?: string;
  opens?: string;                          // memory sheet key, e.g. "day:2:0"
  priority?: boolean;                      // true for the first visible photo (LCP)
};
```

`Stage` (the 9:14 card with container units), `Text`, `Sticker`, `MemorySheet`, `DayRail`, `MapSection` and `Footer` are ported from the Goa HTML once and reused by every template.

Helpers:

```ts
// templates/shared/pickPhotos.ts
// Returns `count` photos, preferring the requested shape, skipping ones already used.
export function pickPhotos(photos: Photo[], count: number, shape: 'tall' | 'wide' | 'any', used: Set<string>): Photo[]

// templates/shared/jitter.ts
// Small stable rotation from the trip seed, so the page looks the same on every visit.
export function jitter(seed: number, key: string, maxDeg = 2): number
```

### 2.5 How a template reads (example)

```tsx
// templates/beach/DayCard.tsx
export function DayCard({ day, index, trip }: { day: Day; index: number; trip: TripData }) {
  const [main, second, third] = day.photos;
  const bg = theme.dayBackgrounds[index % theme.dayBackgrounds.length];

  return (
    <Stage background={bg}>
      <Text x={6} y={3} role="script">Day {day.number}</Text>
      <Text x={7} y={15.5} role="strip">{day.title}</Text>
      {main   && <Photo photo={main}   frame="torn"     x={7}  y={27} width={72} aspect={0.95} rotate={-3 + jitter(trip.seed, `d${index}a`)} opens={`day:${index}:0`} />}
      {second && <Photo photo={second} frame="polaroid" x={46} y={55} width={46} rotate={5}  label={day.places[0]?.name} opens={`day:${index}:1`} />}
      {third  && <Photo photo={third}  frame="polaroid" x={4}  y={64} width={34} rotate={-6} opens={`day:${index}:2`} />}
      <Stamp x={70} y={17.5}>{String(day.number).padStart(2, '0')} {day.places.at(-1)?.name}</Stamp>
      <OpenButton opens={`day:${index}:0`}>read the day ➜</OpenButton>
    </Stage>
  );
}
```

Plain JSX, positions copied from the reference, and missing photos simply don't render. That's the whole "messy data" story for v1.

---

## 3. Database

### 3.1 Tables (`supabase/migrations/0001_tables.sql`)

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  name        text check (char_length(name) <= 60),
  bio         text check (char_length(bio) <= 160),
  home_city   text check (char_length(home_city) <= 60),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  template_id    text not null,
  visibility     text not null default 'unlisted' check (visibility in ('public','unlisted','private')),
  status         text not null default 'draft'    check (status in ('draft','published')),
  title          text check (char_length(title) <= 60),
  short_title    text check (char_length(short_title) <= 30),
  start_date     date,
  end_date       date,
  cover_photo_id uuid,
  seed           int  not null default floor(random() * 2147483647)::int,
  content        jsonb not null default '{"favourites":[],"days":[]}',
  word_count     int  not null default 0,
  published_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (owner_id, slug)
);
create index trips_by_owner on public.trips (owner_id, status, visibility, published_at desc);

create table public.photos (
  id         uuid primary key,              -- made on the phone, also used in the storage path
  trip_id    uuid not null references public.trips(id) on delete cascade,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  width      int not null,
  height     int not null,
  taken_at   timestamptz,                   -- owner-only, never shown publicly
  caption    text check (char_length(caption) <= 80),
  sort       int not null default 0
);
create index photos_by_trip on public.photos (trip_id, sort);

create table public.places (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  name         text not null check (char_length(name) <= 60),
  lat          double precision not null,
  lng          double precision not null,
  geo_ref      text,                        -- geocoder place id (for "everyone's Goa" later)
  city         text,
  country_code text,
  photo_id     uuid references public.photos(id) on delete set null,
  note         text check (char_length(note) <= 300),
  sort         int not null default 0
);
create index places_by_trip on public.places (trip_id, sort);

alter table public.trips add foreign key (cover_photo_id) references public.photos(id) on delete set null;
```

Photo GPS is **never stored**. Only places the user confirms are saved.

### 3.2 Access rules (`0002_rls.sql`)

Owners can do everything with their own rows. **No one else can read tables directly.**

```sql
alter table public.profiles enable row level security;
alter table public.trips    enable row level security;
alter table public.photos   enable row level security;
alter table public.places   enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own trips" on public.trips for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "own photos" on public.photos for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())   -- and the trip must be yours too
              and exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = (select auth.uid())));

create policy "own places" on public.places for all to authenticated
  using      (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = (select auth.uid())));
```

### 3.3 Public reads (`0003_public_functions.sql`)

Three functions, each returning exactly what a page needs.

```sql
-- Trip page. Returns null for drafts, private trips, or wrong slug.
create function public.get_trip(p_handle text, p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip',   to_jsonb(t) - 'owner_id',              -- word_count kept: page uses it for noindex
    'owner',  jsonb_build_object('handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('id', ph.id, 'width', ph.width,
                'height', ph.height, 'caption', ph.caption) order by ph.sort)
              from public.photos ph where ph.trip_id = t.id), '[]'),
    'places', coalesce((select jsonb_agg(jsonb_build_object('id', pl.id, 'name', pl.name, 'lat', pl.lat,
                'lng', pl.lng, 'note', pl.note, 'photo_id', pl.photo_id) order by pl.sort)
              from public.places pl where pl.trip_id = t.id), '[]'))
  from public.trips t join public.profiles p on p.id = t.owner_id
  where p.handle = lower(p_handle) and t.slug = lower(p_slug)
    and t.status = 'published' and t.visibility in ('public', 'unlisted');
$$;

-- Profile page. Only public trips count anywhere on a profile.
create function public.get_profile(p_handle text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p  as (select * from public.profiles where handle = lower(p_handle)),
       t  as (select t.* from public.trips t join p on t.owner_id = p.id
              where t.status = 'published' and t.visibility = 'public'),
       pl as (select pl.*, t.slug from public.places pl join t on t.id = pl.trip_id)
  select jsonb_build_object(
    'profile', (select jsonb_build_object('handle', handle, 'name', name, 'bio', bio,
                  'home_city', home_city, 'avatar_url', avatar_url) from p),
    'stats', jsonb_build_object(
      'trips',     (select count(*) from t),
      'places',    (select count(distinct coalesce(geo_ref, lower(name))) from pl),
      'countries', (select count(distinct country_code) from pl),
      'days',      (select coalesce(sum(end_date - start_date + 1), 0) from t)),
    'trips', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'title', title,
               'short_title', short_title, 'template_id', template_id, 'start_date', start_date,
               'end_date', end_date, 'id', id, 'cover_photo_id', cover_photo_id)
               order by published_at desc) from t), '[]'),
    'pins', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'lat', lat, 'lng', lng,
               'slug', slug)) from pl), '[]'))
  where exists (select 1 from p);
$$;

-- Sitemap. Public trips with enough words to be worth indexing.
create function public.list_sitemap_trips()
returns table (handle text, slug text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, t.slug, t.updated_at
  from public.trips t join public.profiles p on p.id = t.owner_id
  where t.status = 'published' and t.visibility = 'public' and t.word_count >= 80;
$$;

revoke execute on function public.get_trip, public.get_profile, public.list_sitemap_trips from public;
grant  execute on function public.get_trip, public.get_profile, public.list_sitemap_trips to anon, authenticated;
```

Handle availability is checked in the `setHandle` server action (reserved words list in code + a lookup with the admin client).

### 3.4 Storage (`0004_storage.sql`)

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos',  'photos',  true,  5242880, array['image/webp','image/jpeg']),
  ('exports', 'exports', false, 8388608, array['image/jpeg']);

-- Users can write only inside their own folder: {user_id}/...
create policy "write own photos" on storage.objects for insert to authenticated
  with check (bucket_id in ('photos','exports') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id in ('photos','exports') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "read own exports" on storage.objects for select to authenticated
  using (bucket_id = 'exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

Paths (only `lib/storage.ts` knows these):

```
photos/{userId}/{tripId}/{photoId}/thumb.webp      400 px
photos/{userId}/{tripId}/{photoId}/display.webp    1600 px
exports/{userId}/{tripId}/{photoId}/export.jpg     2160 px
photos/{userId}/avatar/{uuid}.webp
```

```ts
// lib/storage.ts (surface)
export const photoUrls = (userId: string, tripId: string, photoId: string) => ({ thumb, display });
export async function uploadPhoto(supabase, ids, blobs: { thumb: Blob; display: Blob; export: Blob }): Promise<void>
export async function exportUrls(supabase, ids[]): Promise<string[]>     // signed, 1 h
export async function deleteTripFiles(admin, userId, tripId): Promise<void>
```

---

## 4. Server actions

All writes go through server actions. The browser only talks to Supabase directly to upload files.

```ts
// lib/action.ts
export function action<I, O>(schema: z.ZodType<I>, fn: (input: I, ctx: { user: User; db: SupabaseClient }) => Promise<O>) {
  return async (raw: unknown): Promise<{ ok: true; data: O } | { ok: false; error: string }> => {
    const input = schema.safeParse(raw);
    if (!input.success) return { ok: false, error: 'Invalid input' };
    const db = await createServerClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return { ok: false, error: 'Not signed in' };
    try { return { ok: true, data: await fn(input.data, { user, db }) }; }
    catch (e) { Sentry.captureException(e); return { ok: false, error: 'Something went wrong' }; }
  };
}
```

| File | Action | What it does |
|---|---|---|
| `features/account/actions.ts` | `setHandle` | Validate, check reserved list + availability, upsert profile |
| | `saveProfile` | name, bio, home city, avatar |
| | `deleteAccount` | Delete every trip's files, then the auth user (admin client) |
| `features/editor/actions.ts` | `createTrip` | Insert draft (`slug = trip-xxxxxx`), return id |
| | `addPhotos` | Insert photo rows after files are uploaded (max 80 per trip) |
| | `removePhoto` | Delete files + row |
| | `saveTrip` | Validate content with `TripContentSchema`, save, recount words, refresh cache if published |
| | `savePlaces` | Replace the trip's places (validated) |
| | `searchPlaces` / `reverseGeocode` | Call `lib/geo.ts` |
| | `publishTrip` | Set visibility + slug (unlisted gets suffix), status published, refresh cache |
| | `setVisibility` | Update; public → unlisted adds suffix; refresh cache |
| | `deleteTrip` | `deleteTripFiles`, delete row, refresh cache |

Cache refresh: tag pages with `trip:{id}` and `profile:{ownerId}` and refresh those tags from the actions (Next 16 `cacheTag` + `revalidateTag`/`updateTag`; check the current docs for exact signatures).

---

## 5. Editor internals

### 5.1 Image worker (`features/editor/image.worker.ts`)

```
read EXIF (date, GPS) with exifr
decode with createImageBitmap (heic2any fallback for HEIC)
draw to OffscreenCanvas at 400 / 1600 / 2160 px → webp / webp / jpeg
re-encoding writes no EXIF, so GPS is gone from every file
return blobs + { width, height, takenAt, gps? }
```

Safari without WebP encoding: use JPEG for all three (bucket allows it).

### 5.2 Upload (`features/editor/upload.ts`)

In-memory queue, 3 at a time, 3 retries with backoff. After a batch finishes, call `addPhotos`. Progress shown per photo.

### 5.3 Days (`features/editor/groupDays.ts`)

```
day = calendar date of (photo time − 4 hours)   // 1 a.m. photos belong to the night before
no date on any photo → everything in Day 1
user can move photos between days, merge, split
```

### 5.4 Place suggestions (`features/editor/suggestPlaces.ts`)

Group GPS points within ~1 km, take up to 10 groups in time order, reverse-geocode each, show as suggestions. Nothing is saved until the user confirms. GPS is discarded after this step.

### 5.5 Autosave

`store.ts` (Zustand) holds the draft. Any change triggers `saveTrip` after 1 s of no typing. Last write wins (one editor per trip).

---

## 6. Trip page

```tsx
// app/(public)/u/[handle]/[slug]/page.tsx
export default async function Page({ params }) {
  const { handle, slug } = await params;
  const trip = await getTrip(handle, slug);      // cached, tagged
  if (!trip) notFound();
  return <TripView trip={trip} />;
}
export const generateMetadata = tripMetadata;
```

```tsx
// features/trip-page/TripView.tsx
export function TripView({ trip }: { trip: TripData }) {
  const { TripPage } = getTemplate(trip.templateId);
  return (<><TripPage trip={trip} /><JsonLd trip={trip} /><OwnerBar ownerHandle={trip.traveler.handle} /></>);
}
```

Porting rules from the Goa HTML:
- Rewrite `innerHTML` strings as JSX. Never `dangerouslySetInnerHTML` with user text.
- All text is in the server HTML (SEO + link previews). The memory sheet reads from the same data.
- Scraps are visible by default. Drop-in animation is added after load, only for spreads below the first screen.
- Fonts self-hosted with `next/font/local`.
- Sticker tray is a viewer toy: client-only, never saved.

Map (`templates/shared/MapSection.tsx`): server renders the list of places. A client part loads MapLibre with `import()` when the section is near the viewport, fits the bounds, and draws chip markers + a dashed route.

---

## 7. Instagram export (`features/export`)

```
1. get signed export URLs → fetch → blob URLs (avoids canvas CORS problems)
2. await document.fonts.ready
3. frames = template.CarouselFrames(trip) or template.StoryFrames(trip)
4. for each frame, one at a time:
     render off-screen at 1080×1350 / 1080×1920
     wait for images to decode
     domToJpeg(node, { width, height, quality: 0.92 }) → blob
5. show results + a "Share" button (separate tap keeps iOS happy)
     navigator.canShare({ files }) ? navigator.share(...) : ZIP download
```

Frames use pixel sizes, not container units. No watermark for now (deferred). **Week 1 spike:** render one frame on an iPhone to confirm `clip-path` torn edges and fonts look right.

---

## 8. OG images

`opengraph-image.tsx` with `next/og`, 1200×630. Trip: cover photo as a tilted polaroid + title + dates + `@handle`. Profile: avatar + name + "N trips · M places". Use the `display` image so output stays under ~300 KB.

---

## 9. Analytics (`lib/analytics.ts`)

```ts
type Events = {
  signup: {}; handle_set: {};
  trip_started: { templateId: string };
  photos_uploaded: { count: number; hasDates: boolean; hasGps: boolean };
  step_completed: { step: string };
  trip_published: { visibility: string; days: number; places: number };
  trip_viewed: { tripId: string; isOwner: boolean; ref?: string };
  profile_viewed: { handle: string };
  cta_make_your_own_clicked: { tripId: string };
  export_clicked: { kind: 'story' | 'carousel' };
  export_success: { kind: string; frames: number; ms: number };
  export_failed: { kind: string; stage: string };
  feedback_submitted: { score: number };
};
export const track = <K extends keyof Events>(event: K, props: Events[K]) => posthog?.capture(event, props);
```

"Make your own" links carry `?ref={handle}`. The `ref` is attached to `signup`.

---

## 10. Tests

| What | Tool | Cases |
|---|---|---|
| Pure logic | Vitest | `groupDays`, `formatDateRange`, `pickPhotos`, `slugify` + suffix, `toTripData` defaults, schemas |
| Database access | Vitest + local Supabase | Logged-out client can't read any table; `get_trip` returns public + unlisted, null for private/draft; profile excludes unlisted/private; user A can't change user B's rows or files |
| Privacy | Vitest | Worker output files contain no GPS |
| Smoke | Playwright (one phone profile) | Sign up → create 1-day trip → publish unlisted → open logged-out → export one frame is 1080×1920 |

---

## 11. Build order

1. **W1:** project setup, fonts, shared template pieces + Beach rendering `/demo`; migrations + database tests; export spike.
2. **W2:** auth + onboarding, upload, editor steps, publish, trip page from DB, OG image.
3. **W3:** profile + map, Instagram export, Shuffle (new seed), analytics, sitemap/robots/JSON-LD.
4. **W4:** fixes from real use, Mountain template, launch checklist.
