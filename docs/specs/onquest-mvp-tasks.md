# OnQuest MVP: ordered build plan

One row per future GitHub issue, in build order across the three specs. The full task blocks (files, ACs, done-when) are in each spec's §12; this file is the order, the dependencies and what can start today. Create the issues from it once GitHub access is back (labels: `spec:onquest-mvp-a|b|c` + `backend` or `frontend`; body = the task row from the spec + a link to the spec).

| Spec | File |
|---|---|
| A: data model + create flow | `docs/specs/onquest-mvp-a-create.md` |
| B: Quest page, reactions, notifications, views, export | `docs/specs/onquest-mvp-b-quest-page.md` |
| C: social layer | `docs/specs/onquest-mvp-c-social.md` |
| PRD | `docs/prds/onquest-mvp.md` |

## Which screens ship first on sample data (PRD question)

Every one of the 20 screens can be built first on sample data, because each spec fixes its view types in §4 (`TripData`, `QuestCard`, `QuestSocial`, `NotificationItem`, `FeedItem`, `ProfileView`, `SearchResults`) and the fixtures live in `lib/demo/`. What can't be finished without the backend is the wiring: real uploads, saves, likes, feeds and search.

Best first, because they carry the most design risk and no backend at all:

1. **The Quest player with Beach** (B-02): every other screen (preview, template choice, export, feed cards) shows it.
2. **Pick photos + the image worker and upload queue** (A-09, A-10): phone memory, HEIC and offline behaviour need real phones early.
3. **Review pages with move/swap/replace/undo** (A-11): the most interaction-heavy screen.
4. **App shell, welcome, Home banner** (C-01, C-02): small, unblock the look of everything else.

The backend meanwhile lands the contract (A-01, same day) and the 0001 data model (A-02, A-03), which everything real depends on.

## Build order

Phases overlap: frontend works top to bottom in the "Frontend" column while the backend works down its own. "Now" = no dependency that isn't already merged (sample data only).

### Phase 0: start now (parallel)

| # | ID | Owner | Task | Depends on | Now? |
|---|---|---|---|---|---|
| 1 | A-01 | Backend | Contract files (schemas, limits, card and profile settings types, `draftToTripData`) | — | **Now** |
| 2 | A-08 | Frontend | Design-system pieces for the create flow (Sheet, Toast with Undo, ProgressRing, Segmented) | — | **Now** |
| 3 | B-02 | Frontend | Quest player + Beach as a paged Quest, on fixtures | — | **Now** |
| 4 | A-05 | Backend | Arranging logic (pure part first), places, captions | A-01 for types; pure functions can start now | **Now** (pure part) |
| 5 | A-10 | Frontend | Image worker + upload queue ported from the WIP | — | **Now** |
| 6 | A-09 | Frontend | Pick photos screen with a fake uploader | A-08 | **Now** |
| 7 | C-01 | Frontend | App shell: bottom bar, Create chooser, header | A-08 | **Now** |
| 8 | A-11 | Frontend | Arranging + Review pages on sample data | A-08 | **Now** |
| 9 | C-02 | Frontend | Welcome screens, Home banner, What's a Quest | C-01 | **Now** |
| 10 | B-03 | Frontend | Quest page chrome (full screen, like, comments, sticky bar, private/removed) on fixtures | B-02 | **Now** |
| 11 | B-04 | Frontend | Mountain template | B-02 | **Now** |

### Phase 1: data model (backend critical path)

| # | ID | Owner | Task | Depends on | Now? |
|---|---|---|---|---|---|
| 12 | A-02 | Backend | Profiles under 0001 (migrations 7–8, `save_profile`, `setHandle`) | A-01 | after A-01 |
| 13 | A-03 | Backend | Trips under 0001 (migration 9: document, drafts, archives, save functions, `get_*` rewritten) | A-02 | — |
| 14 | A-04 | Backend | Quest write actions + loaders (create, save draft, publish, visibility, comments, delete) | A-03 | — |
| 15 | A-06 | Backend | Sign-in return paths (`next`, `intent`, `ref`) | A-02 | — |
| 16 | A-07 | Backend | Analytics plumbing (PostHog proxy, `anon_id`, typed events) | CTO adds `docs/analytics/taxonomy.csv` | when the CSV lands |

**Release 1a** (deploy together, preview project first): migrations 7, 8, 9 + A-02, A-03, A-04. Migrations are applied by the CTO (`supabase db push`) right before the code deploy.

### Phase 2: create flow end to end (frontend continues on sample data until wired)

| # | ID | Owner | Task | Depends on | Now? |
|---|---|---|---|---|---|
| 17 | A-12 | Frontend | Choose template, Preview, Publish sheet, Share screen | A-08, B-02 | **Now** (on fixtures) |
| 18 | C-07 | Frontend | Your Quests tab + ⋯ Manage Quest sheet (sample cards first) | C-01; wiring A-04, C-03 | **Now** (UI) |
| 19 | A-13 | Frontend | Wire the create flow to real actions (autosave, conflicts, resume, offline) | A-04, A-05, A-06, A-09–A-12 | — |
| 20 | A-14 | Frontend | Create-flow events | A-07, A-13 | — |

UX tasks 1–3 (PRD) can run on the preview build after #19.

### Phase 3: Quest page, reactions, notifications, export

| # | ID | Owner | Task | Depends on | Now? |
|---|---|---|---|---|---|
| 21 | B-01 | Backend | Migration 10: likes, comments, notifications, reads, status + social functions | A-03 | — |
| 22 | B-05 | Backend | Reaction actions, loaders, viewer-state route, export URLs, Quest states | B-01, A-04 | — |
| 23 | B-06 | Backend | Notifications loaders + Resend email + unsubscribe | B-01, A-02 | — |
| 24 | B-08 | Frontend | Notifications screen + bell badge | A-08; wiring B-06 | **Now** (UI) |
| 25 | B-09 | Frontend | Instagram export (frames for both templates, export screen) | B-02, B-04; wiring B-05 | **Now** (frames) |
| 26 | B-07 | Frontend | Wire the Quest page (intents, likes, comments, states, OG image) | B-03, B-05, A-06 | — |
| 27 | B-10 | Frontend | Viewer and reaction events | A-07, B-07 | — |

**Release 1b**: migration 10 + B's code. This is the founders' test build (create, share, view, react, notify). UX tasks 4–5 run here.

### Phase 4: social layer

| # | ID | Owner | Task | Depends on | Now? |
|---|---|---|---|---|---|
| 28 | C-08 | Frontend | Home: Your Quests row, feed, suggestions (sample first) | C-01; wiring C-04, B-05 | **Now** (UI) |
| 29 | C-09 | Frontend | Profile, Follow button, followers/following lists (sample first) | C-01; wiring C-05 | **Now** (UI) |
| 30 | C-10 | Frontend | Edit profile, Settings, sign out, delete account (sample first) | C-01; wiring C-05 | **Now** (UI) |
| 31 | C-11 | Frontend | Explore, search, guide page (sample first) | C-01; wiring C-04, C-06 | **Now** (UI) |
| 32 | C-03 | Backend | Migration 11: follows, profile extensions, handle redirects, cards, counts, account data deletion | A-03, B-01 | — |
| 33 | C-04 | Backend | Migration 12: feed, suggestions, trending, chips, travellers, search | C-03 | — |
| 34 | C-05 | Backend | Profile, settings, follow and account actions; handle redirects | C-03, B-06 | — |
| 35 | C-06 | Backend | Guides content + sitemap | C-03 | — |
| 36 | C-12 | Frontend | Social-layer events | A-07, C-07 – C-11 | — |

**Release 2**: migrations 11–12 + C's code. Friends test build.

### Phase 5: proof

| # | ID | Owner | Task | Depends on | Now? |
|---|---|---|---|---|---|
| 37 | B-11 | Frontend | Playwright smoke test (create → publish → view signed out → export one frame) in CI | A-13, B-07, B-09 | — |

Then the founder runs the PRD's five UX tasks (plus the two social tasks if F-C5 is accepted) on the preview build, then human code review, then prod.

## Before any building starts

1. CTO approves the three specs (and answers the CTO decisions in each §14).
2. Founder answers the founder decisions (F-A1 … F-A8, F-B1 … F-B3, F-C1 … F-C6). Only **F-A1** blocks a task (A-05's arranging rule; the rule is isolated in one function so the rest of A-05 proceeds).
3. CTO exports the Taxonomy sheet to `docs/analytics/taxonomy.csv` (blocks A-07 and all event tasks).
4. Accounts: Anthropic API key, Resend account + onquest.in DNS, PostHog project key, geocoder choice (C-A7), Vercel Pro (C-A9).
5. A human updates CLAUDE.md after approval (C-A10).

## Tracker rows to add after approval (stage `7. Ready to build`)

One row per ID above, Owner `Backend agent` or `Frontend agent`, spec link in Notes, in the order of the `#` column.
