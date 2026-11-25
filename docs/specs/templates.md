# Spec: New scrapbook templates (shared mechanism + Coastal)

| | |
|---|---|
| PRD | `docs/prds/templates.md` (draft from founders' decisions 23–25 Nov 2026, QuestLog OQ-9; **founder confirmation pending**) |
| Design | `docs/reference/templates/coastal.html` (visual source of truth) |
| Status | Draft |
| Build mode | Single builder (`frontend`), one PR |
| Tracker IDs | OQ-9 |

Lean spec by request: sections with nothing to say are one line.

## 1. Summary

New Quests get Coastal as the default and only beach-style choice; Quests that already use Beach or the old Mountain render exactly as today. Technically: a third registry status `retired` (kept for rendering, hidden from the picker), one new template folder `templates/coastal/` built from the shared player/export, and a porting recipe (§6) so Mountain, Roadtrip, Winter, Monsoon and Desert each come down to a design file plus one PR.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| AC1 Picker shows only new templates once live | `ChooseTemplate` lists `status === 'live'`; Beach/Mountain set to `retired` | `chooseTemplate.test.tsx` |
| AC2 Draft that chose Beach/old Mountain keeps it | Picker also shows the draft's current retired template, marked selected; nothing rewrites `templateId` | same test |
| AC3 Existing Quests keep their look (page + export) | `templates/beach`, `templates/mountain` unchanged except `status`; `getTemplate` still resolves both | `templateSnapshots.test.tsx` (Beach/Mountain markup unchanged vs. fixtures captured before the change) |
| AC4 New Quests get Coastal | `DEFAULT_TEMPLATE_ID = 'coastal'` in registry, used by `arrangeQuest.ts` and passed as `p_template_id` in `features/editor/actions.ts` | `arrangeQuest.test.ts`, `tests/db/tripSave.test.ts` unchanged (DB default stays `'beach'`) |
| AC5 1/2/3 photos, missing captions, no place, no route | Coastal `PhotoPage` layout table per photo count; caption/stamp/route only rendered when present | `coastal.test.tsx` cases (§11) |
| AC6 Server-rendered text, next/font, reduced motion | Server components; `coastal/fonts.ts`; CSS `prefers-reduced-motion` + `.exportFit` stop all motion | `coastal.test.tsx` (text in static markup), CSS review |
| AC7 Small (1 day/3 photos) and big (5 pages/15 photos) on phone + desktop | Fixtures in `templates/coastal/fixtures.ts` shown on `/demo?template=coastal&size=small|big` | Human UX test on Vercel preview |
| PRD decision 5: export uses the template's pages + link | `coastal/exportFrames.tsx` passes Coastal `Cover`/`PhotoPage` to shared `ExportFrames` | export test + one real export on a phone |

## 3. Approach

The player (`QuestPlayer`), page order (`toQuestPages`), memory sheets, export frames and route layout (`layoutMap`) are already template-agnostic; a template supplies `CoverPage`, `PhotoPage`, a route page, decor and a theme. Coastal is a port of the design's `cover()`, `photoPage()` and `route()` into those slots. The registry gains a status so old looks keep rendering but stop being offered.

## 4. Contract

### 4.1 Data shapes
None. No change to `lib/trip/schema.ts`, `TripData` or `toTripData()`. `templateId` stays `z.string()`.

### 4.2 Template contract (`templates/types.ts`, `templates/registry.ts`)

```ts
// types.ts
status: 'live' | 'coming-soon' | 'retired'; // retired = renders existing Quests, never offered in the picker

// registry.ts
export const templates = { beach, mountain, coastal } satisfies Record<string, Template>;
export const DEFAULT_TEMPLATE_ID: TemplateId = 'coastal';
export const pickableTemplates = (currentId: string) => /* live templates, plus templates[currentId] if it is retired */;
// getTemplate(): unchanged, unknown ids still fall back to Beach (rollback safety, §8)
```

Beach and Mountain: `status: 'retired'`, nothing else changes. Mountain's replacement later takes a new id (`mountain2`… final id chosen in its PR, e.g. `alpine`); the id `mountain` keeps meaning the old look forever.

### 4.3 Server actions / public reads / routes
- `createTrip` in `features/editor/actions.ts`: pass `p_template_id: DEFAULT_TEMPLATE_ID` (argument already exists). No signature change.
- Public reads: none. Routes: none new; `/demo` accepts `?template=` and `?size=` (noindex as today).

## 5. Database and storage
None. No migration: `template_id` is free text and `create_trip` already takes `p_template_id`; its `'beach'` default stays so the previous release behaves the same. No in-place updates involved. Template assets ship in the build, not Storage.

## 6. Frontend, and the porting recipe (every new template)

1. **Folder** `templates/<id>/`: `index.ts`, `theme.ts`, `fonts.ts`, `TripPage.tsx`, `CoverPage.tsx`, `PhotoPage.tsx`, `RoutePage.tsx`, `layouts.ts`, `decor.tsx`, `background.tsx`, `exportFrames.tsx`, `<id>.module.css`, `assets/`, `fixtures.ts`, `<id>.test.tsx`. Copy `templates/mountain` (newest shape) and its `TripPage`/`exportFrames` unchanged in structure.
2. **Theme**: the design's `:root` vars map 1:1 to `ThemeColors`; `dayBackgrounds` = the design's `backgrounds`; tapes in `theme.ts`.
3. **Fonts**: the design's families via next/font, exposed as all 5 variables; variables the design does not use alias the nearest design font (Coastal: script = Pacifico, hand = Caveat, sans/type/serif = Nunito). No extra downloads.
4. **Backgrounds per page**: `background.tsx` ports the design's `bg()` as a component taking `(variant, seed)`; the page picks `variant` by page index exactly like the design (Coastal: cover `top`, odd pages `top` + light text, even `bottom`, route `bottom`). SVG ids come from React `useId()` (many pages share one HTML document). Turbulence textures are baked (Decision D3).
5. **Layouts**: `layouts.ts` = the design's `L` table `{1: […], 2: […], 3: […]}` as `{x, y, width, aspect, rotate}` in % of the Stage, re-fitted to 9:14 (D1). Photo shape choice via `pickPhoto`; rotation offsets via `jitter(seed, key)` with keys prefixed `<id>:` so they never collide with Beach/Mountain keys.
6. **Text**: kicker, title, page title, meta, captions, stamp from `TripData` only (no sample text). Missing → not rendered (no empty caption strip, no stamp without a place).
7. **Route page**: design's pin-and-dashes style drawn from `layoutMap(trip.places)`; only exists when `toQuestPages` adds it (≥ 2 places).
8. **Decor**: stickers as small SVG components in `decor.tsx`, picked by page index as in the design (no `Math.random()`).
9. **Motion**: polaroids use the shared `.scrap` + `data-dropping` drop-in (so export and below-the-fold logic already work); ambient motion (waves, gulls) only via `transform` on groups without filters, off under `prefers-reduced-motion` and inside `.exportFit`.
10. **Export**: `exportFrames.tsx` = `{ theme, Cover, Page }` passed to shared `ExportFrames`, nothing template-specific.
11. **Register**: add to `templates/registry.ts` with `status: 'coming-soon'` until the phone test passes, then `live` (and the template it replaces → `retired`) in the same PR.
12. **Tests** (`<id>.test.tsx`, `renderToStaticMarkup`, fixtures in `fixtures.ts`): small trip (1 day / 3 photos / no text), big trip (5 pages / 15 photos), 1/2/3 photos on a page, no places (no route page, no stamp), missing captions (no caption text or empty element), all titles/dates present in the static HTML.

States: templates have no loading/error states; missing data is simply not drawn.

## 7. Security and privacy

| Rule | Applies? | How |
|---|---|---|
| No `dangerouslySetInnerHTML` with user text | Yes | Design's `innerHTML` strings rewritten as JSX; SVG built as JSX |
| Templates pure, never import `design-system/` or `features/` | Yes | Coastal imports only `templates/shared`, `lib/trip/types` |
| Fonts self-hosted | Yes | next/font; the design's Google Fonts `<link>` is not ported |
| Others (RLS, GPS, secret key, logging) | No | No data, DB or upload change |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| `trips.content`, drafts, archived rows | None | No shape change; old drafts keep their `templateId` | picker test with a `beach` draft |
| Existing trip rendering | None | Beach/Mountain code, jitter keys, defaults untouched; Coastal jitter keys prefixed | snapshot test of Beach + Mountain markup |
| Public functions, URLs, storage | None | Unchanged | none needed |
| Rollback | Coastal Quests created after deploy | Previous release falls back to Beach via `getTemplate` (readable, not lost); after re-deploy they render as Coastal again | manual check on preview: `templateId: 'unknown'` renders Beach |

Deploy order: code only.

## 9. Performance and cost

No new service or storage. Baked textures: ~3 small WebP tiles (< 30 KB total, shared by all pages). No live `feTurbulence` (a full-page turbulence filter behind animated waves can be re-rasterised every frame, a known cost on low-end phones; not measured here). Hidden player pages are `hidden` (not painted). Export time unchanged.

## 10. Analytics
None new. (Whether existing create/publish events carry `templateId` is unverified; adding it is Later.)

## 11. Test plan

- Unit: `coastal.test.tsx` (recipe step 12), `templateSnapshots.test.tsx` (Beach/Mountain unchanged), `chooseTemplate.test.tsx` (retired hidden; current retired shown and selected), `registry.test.ts` (`DEFAULT_TEMPLATE_ID` is live; `getTemplate('unknown')` is Beach), `arrangeQuest.test.ts` default.
- Database / Playwright: no change; the existing smoke test runs on Coastal by default.
- Human UX test (Vercel preview, phone + desktop): `/demo?template=coastal&size=small|big`; create a Quest → Coastal preselected; open an existing Beach Quest → unchanged; export story + carousel from a Coastal Quest and check the backgrounds and link appear.

## 12. Tasks

| ID | Owner | Task | Touches | Covers | Depends on | Done when |
|---|---|---|---|---|---|---|
| T1 | frontend | Registry `retired` status + default + picker rule, and the Coastal template per §6 | `templates/types.ts`, `templates/registry.ts`, `templates/coastal/**`, `templates/beach/index.ts` + `templates/mountain/index.ts` (status only), `features/editor/ChooseTemplate.tsx`, `features/editor/arrangeQuest.ts`, `features/editor/actions.ts` (one argument), `app/(public)/demo/page.tsx`, tests in §11 | AC1–AC7 | none | CI green; §11 tests pass; Coastal matches `coastal.html` on a phone at 1/2/3 photos; Beach/Mountain snapshot unchanged; story + carousel export from Coastal on a real phone; Reviewer pass |

Size: ~600 lines including SVG decor; over the ~400 guideline because decor is mostly static markup. If it runs over ~800, split T1a (registry + picker + default, Coastal at `coming-soon`) and T1b (Coastal look, flip to `live`).

No GitHub issue created (per request); this block is the issue text.

## 13. Decisions

| Decision | Options | Choice | Reason | CTO? |
|---|---|---|---|---|
| D1 Page ratio | Keep 9:14 for all / per-template ratio / move all to 9:15 | **Keep 9:14** | Player, `Stage`, `ScaledFrame` and export math (`page.width * 14 / 9`) stay as they are. At 9:15 the carousel page (810 wide → 1350 tall) no longer fits 1080 × 1350 with the link, and the story page runs into Instagram's bottom safe area; fixing that means smaller pages in every export. Designs are re-fitted: the background SVG stretches (`preserveAspectRatio="none"`), and layout y-positions are checked so the bottom photo of the 3-photo layout clears the edge | Yes |
| D2 Marking old templates | Separate `legacyTemplates` map / boolean flag / third `status` | **`status: 'retired'`** | `TemplateId`, `getTemplate`, drafts and published Quests keep working with no data change; the picker already filters on `status` | Yes |
| D3 Background texture | Live `feTurbulence` / baked tiles / drop the texture | **Baked WebP tiles** generated once from the design's filters | Live turbulence is costly on low-end phones and `modern-screenshot` does not reliably resolve `url(#filter)` references into the captured image; CSS/`<image>` textures are inlined into the capture | No |
| D4 Old draft in picker | Hide retired entirely / show the draft's current retired one | **Show current one** (and for an already-published Quest show only its current template) | Draft keeps its look unless the writer picks a new one; switching a published Quest is out of scope | No |

## 14. Risks and open questions

- Technical: re-fitting 9:15 layouts to 9:14 may need small y nudges per template; done by eye against the design, not by formula.
- Product: PRD is not yet confirmed by the founder, and has no UX test plan or written empty states (only "nothing missing is drawn"); §11's human test stands in until it does.

## 15. Later

Per-template page ratio; switching an existing Quest's template; MapLibre route page; Mountain, Roadtrip, Winter, Monsoon, Desert (one PR each via §6).
