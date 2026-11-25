# PR review: Templates (Coastal + retired Beach/Mountain, OQ-9), PR #34, 2026-11-25

## PR review: PASS (round 1 of 3), blockers-only review at the CTO's request

Diff: `git diff origin/main...HEAD` on `spec/templates` (0b25bba..dc63bb6). Spec: `docs/specs/templates.md`.

**Checks:** "Typecheck, lint, test, build" success on dc63bb6 (`gh api …/check-runs`). Not re-run locally, because the npm registry doesn't resolve in this session.

This review covers only the coordinator's list.

| Check | Result | Evidence |
|---|---|---|
| Existing Beach and old-Mountain Quests and their exports render unchanged | Pass | `templates/templateSnapshots.test.ts` fingerprints the page, story and carousel for 4 sample trips × 2 templates. I checked the capture run's CI log (052d77b, job 138986080469): the hashes printed there from main's template code (e.g. `beach/page/goa` 15759a1bcd1c5599, `mountain/story/small` be1efda4d70c6126) are the ones pinned at HEAD, and HEAD's CI passes. Between the capture and HEAD, `templates/beach`, `templates/mountain` and `templates/shared` change only in `status: 'retired'` (not rendered) and a test-only font stub identical to the inline one used for the capture. `jitter`, its keys and both templates' `defaults` are untouched |
| Old drafts keep a retired template selected | Pass | `pickableTemplates(currentId)` = live templates + the draft's current retired one. `ChooseTemplate`: a Beach draft is offered `Coastal, Beach (selected)`; published Quests are offered only their own look (spec D4). `chooseTemplate.test.ts`, `registry.test.ts` |
| Unknown ids fall back safely | Pass | `getTemplate` still falls back to Beach for unknown ids (`registry.test.ts`). `templateId` is `z.string()` in `lib/trip/schema.ts`, and `trips.template_id` is `text` with no check, so `coastal` stores fine. On a rollback, the previous release renders Coastal Quests as Beach (fallback) instead of failing. That's acceptable; say so in the PR's rollback note |
| The default change can't alter an existing Quest | Pass | `DEFAULT_TEMPLATE_ID = 'coastal'` is used only by `createQuest` (`create_trip(p_key, p_template_id)`) and `arrangeQuest` → `buildDocument`. `Arranging` runs only right after photos are picked for a new draft (a reload after arranging goes to review). The database default stays `'beach'`. No migration; no stored row is touched |
| Coastal follows the template rules | Pass | No `Math.random`, `Date.now`, `fetch`, hooks, `'use client'`, or `design-system`/`features` imports in `templates/coastal`. Uses `jitter(trip.seed, key)`. Wrapped in `ScrapbookPage` with shared `QuestPlayer`/pages. Server-rendered text, SVG `<text>` included. `coastal.module.css` has `@media (prefers-reduced-motion: reduce) { animation: none !important }` for its two animations |
| No raw styles in `app/`, `features/`, `lib/` | Pass | The added lines there have no hex, `rgb()`, arbitrary values, palette classes or inline styles. Coastal's own palette lives in `templates/coastal/theme.ts` and its CSS module, as CLAUDE.md allows. `noRawStyles.test.ts` green |

### Blocking

None.

### Notes

- N1. `/demo?size=…` loads Coastal fixtures from `templates/coastal/fixtures.ts` in `app/`. That's a demo-only import of test data from a template folder; it's harmless, but moving the fixtures to `lib/demo/` would keep templates free of app-facing exports.
- N2. The story frame fingerprints are identical for goa, full and old (`61dcd4f1…` Beach, `3c51f146…` Mountain). That's pre-existing behaviour (the story frame doesn't depend on those trips' differences), not a regression.

### Tracker (for the CTO)

OQ-9 templates PR → `10. UX testing (human)`. Notes: "Blockers-only review PASS; fingerprints verified against the main-capture CI log."
