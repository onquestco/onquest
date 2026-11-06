# Spec: <Feature name>

| | |
|---|---|
| PRD | `docs/prds/YYYY-MM-<feature-slug>.md` (approved by founder on YYYY-MM-DD) |
| Status | Draft / In review / Approved by CTO |
| Build mode | Single Builder / Backend + Frontend split |
| Tracker IDs | |

## 1. Summary

Two or three sentences: what changes for the user, and the shape of the technical change.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by (component / action / function) | Proved by (test) |
|---|---|---|
| AC1 … | | |

## 3. Approach

How it works end to end, in a few short paragraphs. Which existing pieces it reuses. A small diagram if the flow branches.

## 4. Contract

The exact shapes frontend and backend build against.

### 4.1 Data shapes (zod, `lib/trip/schema.ts` and `lib/trip/types.ts`)

```ts
// new or changed fields, with defaults applied in toTripData()
```

### 4.2 Server actions (`features/<area>/actions.ts`, built with `action()`)

| Action | Input (zod) | Result data | Errors | Cache tags refreshed |
|---|---|---|---|---|

### 4.3 Public reads

New or changed `get_*` functions, their arguments and returned fields. "None" if unchanged.

### 4.4 Routes

| Route | Server/client | Loader | Metadata | Index / noindex | Sitemap |
|---|---|---|---|---|---|

## 5. Database and storage

- Migration file name and what it does
- RLS policies (owner-only unless stated)
- Database tests to add in `tests/db/`
- Storage paths and bucket rules

## 6. Frontend

Components to add or change in `features/<area>/` and `templates/`, states (loading, empty, error, success), and template rules that apply (pure, no empty boxes, seeded jitter).

## 7. Security and privacy

| Rule (CLAUDE.md / security doc) | Applies? | How the design meets it |
|---|---|---|

## 8. Backward compatibility

What already exists and must keep working: published trips, shared links and Instagram exports, drafts in progress, stored photos, and the previous release (rollback).

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored `trips.content` (old rows still parse) | | | |
| Drafts in progress | | | |
| Migrations (expand → contract, rollback-safe) | | | |
| Public functions and their zod schemas | | | |
| Public URLs, slugs, handles, OG | | | |
| Existing trip rendering (jitter keys, defaults, templates) | | | |
| Storage paths and variants | | | |
| Server actions, cache tags, env vars, analytics events | | | |

Deploy order: migration before code / code before migration / together, and why.
Breaking changes accepted by the PRD (if any), with the migration, redirect or message that handles them.

## 9. Performance and cost

Effect on LCP, upload, export time; any new paid service or storage cost.

## 10. Analytics

Events to add with `track()`, and their properties.

## 11. Test plan

- Unit (Vitest):
- Database access (`tests/db/`):
- Backward compatibility (old-shape content fixtures, migrations on seed data):
- Playwright:
- Human UX test cases (from the PRD's UX test plan, run on the Vercel preview):

## 12. Tasks

| ID | Owner | Task | Touches | Covers ACs | Depends on | Done when |
|---|---|---|---|---|---|---|

## 13. Decisions

| Decision | Options considered | Choice | Reason | Needs CTO sign-off? |
|---|---|---|---|---|

## 14. Risks and open questions

- Technical (for the CTO):
- Product (for the founder):

## 15. Later

What we deliberately left out, so it isn't lost.
