## What and why

<!-- One or two sentences. -->

Spec: `docs/specs/<feature>.md` · Task issue: #
Built by: <!-- backend / frontend / builder agent, or a person -->

## Acceptance criteria covered

| AC | Where | Test |
|---|---|---|
|  |  |  |

## Checklist (author)

- [ ] Matches the spec's contract; any difference is explained here and the spec is updated
- [ ] New table → RLS on, owner-only policies, database test
- [ ] Writes go through `action()`; public-page writes refresh their cache tags
- [ ] No secrets, user text, emails or photo URLs in code, logs or tests
- [ ] Backward compatible: existing trips still parse and look the same, URLs and public functions unchanged or redirected, migrations safe for the running and previous release
- [ ] Works with a small trip (1 day / 3 photos / no text) and a big one (10 days / 60 photos)
- [ ] `npm run typecheck && npm run lint && npm test` pass locally

## Gates (filled in by reviewers, in order)

- [ ] Reviewer agent: PASS
- [ ] UX test on the Vercel preview: Pass (tester: )
- [ ] Code review: Approved (reviewer: , not the UX tester)
