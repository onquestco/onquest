# OnQuest

A home on the web for your trips: each trip is an interactive scrapbook page (`/@handle/slug`), each traveler has a profile (`/@handle`), and trips export to Instagram stories/carousels.

The product is OnQuest (`onquest.in`). "Scrapbook" in code, like `ScrapbookPage`, is the name of the page style and stays.

Specs: `docs/travel-scrapbook-mvp-prd.md` (what), `docs/01-hld.md` (how it fits together), `docs/02-lld.md` (details), `docs/03-security-visibility-seo.md` (privacy, security, SEO). Decisions that override older docs: `docs/decisions/`. Visual source of truth for the Beach template: `docs/reference/goa-trip.html`.

## How work arrives

Approved product PRDs go in `docs/prds/`. The `tech-lead` agent (`.claude/agents/tech-lead.md`) turns each one into a spec in `docs/specs/<feature>.md` (from `docs/specs/TEMPLATE.md`) plus one GitHub issue per task. The `reviewer` agent reviews the PRD and spec together before the CTO approves, and can audit the whole setup on request (reports in `docs/reviews/`). Build only what an approved spec describes; if the spec and the code disagree, stop and ask. Every PR must pass CI (`.github/workflows/ci.yml`: typecheck, lint, test, build) and a review by the `reviewer` agent (`.claude/agents/reviewer.md`) before the human UX test and code review. Work is tracked in the "OnQuest Build Tracker" Google Sheet.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind (app screens) · CSS modules (templates) · Supabase (Auth, Postgres, Storage) · Zustand (editor only) · zod · MapLibre GL · modern-screenshot · PostHog · Sentry · Vitest · Playwright

## Commands

```bash
npm run dev           # app on :3000 (open /demo)
npm run typecheck
npm run lint
npm test              # unit + database access tests (in-memory Postgres, no Docker needed)
npm run format        # Prettier
npm run tokens        # regenerate design-system/tokens.css after changing tokens.ts
supabase start        # local DB, auth, storage (from week 2)
supabase db reset     # re-run migrations + seed
supabase gen types typescript --local > lib/supabase/database.types.ts
```

## Status

Week 1 done: project setup, Beach template rendering `/demo` from `lib/demo/goaTrip.ts`, migrations + access tests.
Week 2 so far: Supabase clients, login + onboarding, `toTripData()`, `/@handle/slug` from the DB. Login is not yet tried against a real Supabase.
Next (week 2): editor + upload, publish, OG image. See `docs/02-lld.md` §11.

## Where things go

```
app/         Routes only. Fetch data, render one feature component. No logic.
features/    Product areas: trip-page, profile, editor, export, account.
             Each owns its components, server actions, helpers and tests.
templates/   Scrapbook looks. shared/ = building blocks, beach/ mountain/ = templates.
design-system/ App look: tokens.ts (the only colours, fonts, type styles, radii), generated tokens.css, fonts, Button/TextField/Logo.
lib/         App-wide helpers: supabase clients, storage, geo, schemas, dates, analytics.
supabase/    Migrations + seed.
```

Imports flow one way: `app → features → templates → lib`. Templates never import from features. lib imports nothing from the app. `app` and `features` use `design-system/`; templates never do.

## Design system (do not break)

- App colours, fonts, type styles and radii come only from `design-system/tokens.ts` (decision `docs/decisions/0002-design-system-single-source.md`), used as Tailwind classes (`bg-brand-strong`, `text-ink`, `text-title`, `rounded-pill`), the components in `design-system/components/`, or `color('…')` for raw values.
- No hex, `rgb()`, Tailwind palette classes (`slate-*`), arbitrary values (`p-[13px]`), `text-sm`-style sizes or font families in `app/`, `features/` or `lib/`. `design-system/noRawStyles.test.ts` fails the build.
- A new colour or size is a design-system change: the claude.ai design system page, then `tokens.ts`, then `npm run tokens`.
- Templates keep their own palette and fonts (`theme.ts`, `fonts.ts`) and never import `design-system/`.

## Code style

- **Readable over clever.** Plain names (`groupPhotosIntoDays`, not `gpd`). No one-letter variables except `i` in short loops.
- **Small files.** Aim for < 200 lines. Split by meaning, not by size alone.
- **No premature abstraction.** Copy once, abstract the third time.
- **Types:** `strict: true`, no `any`, no non-null `!` without a comment. Stored data shapes are zod schemas in `lib/trip/schema.ts`; use `z.infer` instead of repeating types. DB types come from `supabase gen types`.
- **Components:** function components, props typed inline or as `Props`. Server components by default; add `'use client'` only for interactivity.
- **No barrel files** (`index.ts` re-exports), except each template's `index.ts` default export.
- **Comments** explain _why_, not _what_.
- **Formatting:** Prettier defaults, ESLint (next + typescript-eslint). Don't disable rules without a comment.

## Data rules

- **No in-place updates** (`docs/decisions/0001-no-in-place-updates.md`). Every record has one permanent `key` (no second id, no version number); a row, once written, never changes. Every save moves the current row to the archive and inserts the new one under the same key, in one Postgres function (one transaction). All lookups, references, URLs, cache tags and analytics use the `key`. No `.update()` or `.upsert()` on data tables, no update grants, policies or `updated_at` triggers. Saves pass the `saved_at` of the row they were based on and fail with a conflict if the live row has changed. The only real delete is a user's trip or account deletion, which removes the live row, its archived rows and the files. *The current schema doesn't follow this yet; new work must, and the migration spec will fix the rest.*
- All writes go through server actions built with `action()` from `lib/action.ts` (zod-validated, signed-in check, typed `{ ok, data | error }` result).
- The browser talks to Supabase directly only to upload photo files.
- Public pages read only via `get_trip`, `get_profile`, `list_sitemap_trips`. Never add an anonymous `select` policy to a table.
- After any write that changes a public page, refresh its cache tags: `trip-url:{handle}/{slug}` (`tripUrlTag()` in `lib/cacheTags.ts`, keyed by URL so cached 404s clear too; refresh the old URL as well when a slug changes), `profile:{ownerId}`.
- `toTripData()` is the only place that turns DB rows into `TripData` and applies defaults.

## Security rules (do not break)

- Every new table: RLS on, owner-only policies, plus a database test.
- Never `dangerouslySetInnerHTML` with user text. JSON-LD must escape `<`.
- Never store photo GPS. Images are re-encoded in `features/editor/image.worker.ts` (removes EXIF).
- The secret key is only used in `lib/supabase/admin.ts` (`import 'server-only'`).
- Use `supabase.auth.getUser()` on the server to identify the user.
- Don't log user text, emails or photo URLs.

## Backward compatibility (do not break)

Published trips, shared links, drafts and stored photos already exist, and the previous release must work if we roll back.

- `trips.content` has no version and is parsed on every view: add fields as optional with defaults in `toTripData()`; never narrow a limit, make a field required, rename or remove one without a migration that rewrites old rows.
- Migrations: additive first, remove later (expand → contract). Old code must keep working while a migration runs.
- Never change a public URL without a permanent redirect. Never change `get_*` function arguments or remove returned fields.
- Don't change `jitter` keys, its algorithm or template defaults unless the spec says existing pages should change.
- Storage paths and variant names never change; a replaced photo gets a new id.
- Test changes to stored shapes with old-shape data, not only new data.
- Archived rows keep their old shape forever: reading them follows the same rules.

## Templates

A template is a folder that default-exports a `Template` (see `templates/types.ts`):

```ts
export default {
  id: 'beach',
  name: 'Beach',
  status: 'live',
  defaults: { title: 'Salt in the Air, Sand in My Hair', closingHeadline: 'Nowhere else to be.' },
  theme,
  TripPage,
  // StoryFrames, CarouselFrames: added with Instagram export in week 3
} satisfies Template;
```

Rules:

- Pure: `TripData` in, markup out. No fetching, no global state, no `Math.random()` (use `jitter(seed, key)`).
- Wrap the page in `ScrapbookPage` (theme, fonts, memory sheet, stickers, footer) and build from `templates/shared` (`Stage`, `Photo`, `Text`/`Strip`/`Stamp`/`Sticker`, `DayRail`, `MapSection`).
- Load the 5 fonts in `<template>/fonts.ts` with next/font as `--font-script`, `--font-type`, `--font-hand`, `--font-serif`, `--font-sans`.
- Handle missing data by not rendering it (`{photo && <Photo …/>}`). Never show empty boxes.
- Positions are % of the Stage on the trip page, px at 1080 wide in Instagram frames.

### Add a new template

1. Copy `templates/beach` to `templates/<name>`.
2. Change `theme.ts`, layouts in the spread components, CSS module, `assets/`.
3. Add it to `templates/registry.ts` (the `TemplateId` type updates itself).
4. Check it with a small trip (1 day / 3 photos / no text) and a big one (10 days / 60 photos).

### Add a new page or feature

1. Create `features/<name>/` with the view component, a `get*.ts` loader, and `actions.ts` if it writes.
2. Add the route in `app/` that calls the loader and renders the view (nothing else).
3. Public page? Add `generateMetadata`, decide index/noindex, add it to `sitemap.ts` if indexable.
4. New table? Migration + RLS + database test + regenerate types.
5. Track key actions with `track()` from `lib/analytics.ts`.

## Testing

- Pure logic (grouping, dates, slugs, `toTripData`, `pickPhotos`): Vitest, next to the file (`*.test.ts`).
- Access rules: `tests/db/` runs the real migrations + seed in PGlite (in-memory Postgres) with small stand-ins for Supabase's `auth` and `storage` schemas. Every RLS change needs a test. Re-check against `supabase start` before launch.
- One Playwright smoke test covers create → publish → view logged out → export one frame.

## Porting the Goa reference

- Rewrite its `innerHTML` strings as JSX. Copy positions from its `sc({...})` calls into `<Photo x y width rotate …/>`.
- All text must be server-rendered (SEO + link previews).
- Fonts via `next/font/google`, which downloads them at build time and serves them from our domain (no Google Fonts calls at runtime).
- Replace hard-coded Goa values ("GOA INDIA", "Hello, Goa.", place ids) with `TripData` fields.
- Day numbers: `String(n).padStart(2, '0')`. Day backgrounds cycle through `theme.dayBackgrounds`.
