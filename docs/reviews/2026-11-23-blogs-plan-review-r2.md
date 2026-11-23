# Plan review: Blogs (OQ-11, spec PR #20), round 2, 2026-11-23

## Plan review: APPROVE WITH CHANGES (round 2 of 3)

Reviewed: `docs/specs/blogs.md` and `docs/prds/blogs.md` at 1a5b868 (branch `spec/blogs`, now rebased on `main` a38a847), checked against §17, the round 1 report (`docs/reviews/2026-11-23-blogs-plan-review.md`) and the code and migrations on `main`.

**Technical: ready for CTO approval.** Every round 1 technical finding is resolved, and none of the changes introduces a new blocking problem.

**Product: one gate is still open.** The PRD addendum was agreed by the CTO, not by the PRD owner, so the founder must sign it off (P1). It needs no spec edit, only a one-line confirmation.

---

### Round 1 findings, re-checked

| # | Round 1 finding | Status | Evidence |
|---|---|---|---|
| Founder 1 | §14 Q1, Q2, Q4 contradict the PRD; the PRD owner must confirm | **Partly resolved** | Decisions recorded in the PRD "Changes after tech review" (points 1–5) and the spec §14 table. They were "agreed by Swati (CTO)", and §14 says Alok "should see them… The spec doesn't wait on that". Product calls are the founder's (P1) |
| Founder 2 | Unlisted Quest discoverable through a public blog | Resolved | D12. `get_blog_quest` shows readers of a public blog only a public Quest (§4.3). BL-01 tests cover both directions. The owner sees the card via `/me` (§4.1 `ownLinkedQuest`). §7 is updated |
| Founder 3 | No email at launch | Resolved | §14 "Email at launch" note |
| T1 | Routes outside `(signed-in)`; `NEEDS_ACCOUNT` | Resolved | §4.4 and BL-03/BL-04 Touches now use `app/(app)/(signed-in)/…`. `/blogs` is added to `NEEDS_ACCOUNT` (§6.4, BL-03). `/create` calls `has_feature_access` only when a user is signed in (§3.9). `app/robots.ts` path corrected |
| T2 | BL-02 breaks the Home feed and bell before BL-05 | Resolved | BL-02 owns `HomeFeed.tsx` (drops blog items) and `notificationText.ts`, with `HomeFeed.test.tsx`. Rollout rule: no production grant before BL-05 (§3.9, §8, runbook). The preview project exists (HLD §188) |
| T3 | BL-03 needs BL-04's components | Resolved | `BlogArticle`, `BlogBody` and `BlogGallery` and their tests are in BL-03. BL-04 depends on BL-03. BL-04's edit of `BlogComposer.tsx` is ordered after BL-03 |
| T4 | Blog key can equal a Quest key | Resolved | `create_blog` checks `trips`/`trips_archive`. `create_trip` is replaced to check `blogs`/`blogs_archive` (D14, BL-01 ACs) |
| T5 | Rate limit shared one way | Resolved | `post_comment` replaced in migration 17. It uses the same `comment/{user}` advisory lock, which matches the existing `post_comment` on `main` (migration 10, line 207) |
| T6 | Analytics gaps | Resolved | `view_id` on `blog_quest_opened`. `blog_create_started{blog_id, source}` fires in the composer. `/create?source=write_your_own` is passed through. `create_option_tapped` is added. `shouldTrackDraftSave` has a unit test |
| T7 | Docs not written | Resolved differently, accepted | A concrete docs checklist ships in BL-01 (Appendix A) instead of this PR. That is acceptable: the docs land with the code that makes them true. See N2 |
| T8 | 0001 retention amendment | Resolved differently | An amendment draft is in the BL-01 checklist, with every archive age listed. See N1 |
| T9 | Branch not on `main`; stale OQ-16 text | Resolved | `main` is an ancestor of HEAD, and migration 15 is present. No `signInPath` fallback or "if OQ-16 merged" text is left |
| T10 | Replacement bases | Resolved | R1 names each base migration. They match `main`: `get_profile` 14, `search_public` 13, `list_my_notifications`/`post_comment` 10, `create_trip` 9, the rest 12 |
| T11 | `list_pending_deletions` | Resolved | §4.3 and BL-01 AC |
| T12 | Deploy skew | Resolved | Recorded in §8 |
| T13 | Who applies migrations | Resolved | §8, plus `docs/runbooks/migrations.md` in BL-01 |
| T14 | `get_blog` wording | Resolved | §4.3 lists exactly what is and isn't returned |
| T15, T16 | BL-02 size; IndexedDB | Resolved | R6, R7 |

### For the founder (product)

P1. **[Blocking for the approval gate] Alok, as PRD owner, confirms the PRD addendum, points 1–4.**
- Points 1–4 change approved PRD wording, and point 4 (D12) is a new product rule on privacy and an edge case.
- They are recorded as "Agreed by Swati (CTO)". Under the pipeline, product decisions belong to the founder.
- Fix: one line from Alok in the PR or the tracker ("Addendum points 1–5 agreed"), then edit the founder's source doc to match.
- No spec change is needed. The CTO can approve the spec once that line exists.

P2. **[Note] UX test 1 needs a public Quest.** The test links "a Quest" and posts as Public. Under D12, a linked *unlisted* Quest won't show to readers. The tester should link a public Quest, or expect "Your linked Quest isn't visible to readers". Add this to the tester's checklist in BL-05.

P3. **[Note] The Link a Quest sheet has no warning.** Unlisted Quests can be linked with no copy in the sheet (§6.1). On a public blog the writer finds out only afterwards, from the owner note. A short hint on unlisted rows ("Hidden from readers of public blogs") would avoid the surprise. This is a founder copy call and doesn't block.

### For the Tech Lead (technical)

None blocking. New, from the round 1 changes:

N1. **[Should fix] The 0001 amendment draft overstates "Current gaps fixed"** (Appendix A BL-01 docs checklist, "Mark 'Current gaps' as fixed by spec A").
- On `main` the legacy `own photos` and `own places` policies are still `for all` (`20261031000002_rls.sql` lines 17 and 24). They were never dropped.
- They are inert, because migration 9 revoked insert, update and delete on those tables (`20261110110000_09_trips_documents.sql` lines 174–175).
- Fix: either list them as a remaining gap (drop them in a later migration) or have BL-01 drop them. The decision text should be accurate.

N2. **[Note] Docs ship in the build PR, not the spec PR.**
- Until BL-01 merges, CLAUDE.md still says public pages read only via `get_trip`/`get_profile`/`list_sitemap_trips`, while the approved spec adds six more functions.
- That is fine, because the spec authorises it. But the CTO should approve the CLAUDE.md and 0001 edits as their own owner, not just as a line in a builder's diff.

N3. **[Note] Keep `create_trip`'s default.** The replaced `create_trip` must keep `p_template_id text default 'beach'` (migration 9 line 285). The spec says "same arguments (uuid, text)"; the default matters for existing callers. Add it to the BL-01 AC or the grants and signature test.

N4. **[Note] `blog_create_started` now fires on composer open, not on the chooser tap** (§6.1). Its meaning differs slightly from the PRD ("Write a blog tapped"). Draft completion is unchanged in practice, since a resumed unsent draft doesn't re-fire. Update the Taxonomy sheet description to match.

### Coverage

The round 1 table still holds. Added and confirmed:
- **D12 linked-Quest rows:** `blogAccess.test.ts` covers three cases: public blog + unlisted Quest → null, unlisted blog + unlisted Quest → card, owner `/me` → card with the hidden flag.
- **Key-reuse safety:** `blogSave.test.ts`, both directions.
- **Rate limit across both comment tables:** `blogSocial.test.ts` plus the existing `comments.test.ts` unchanged.
- **Home with blog items before BL-05:** `HomeFeed.test.tsx`.
- **Analytics joins:** `shouldTrackDraftSave.test.ts`, plus `view_id` on three events.

### Security and privacy

No regressions:
- **D12** tightens linked-Quest visibility. An unlisted Quest's URL never appears on a listed, indexed or sitemapped page.
- **`create_trip`/`post_comment` replacements** keep their arguments and grants. Both are security definer with `search_path = ''`, the same as their bases.
- **`NEEDS_ACCOUNT` + `(signed-in)` placement** closes the round 1 gate gap.
- **Rollout rule** keeps production free of blog rows until every screen renders them.

### No in-place updates

Unchanged from round 1: all OK. The two replaced functions insert only (a comment row, or the trip and draft rows), with no `update`.

### Backward compatibility

| Area | Safe? | Notes |
|---|---|---|
| Replaced `create_trip`, `post_comment` | Yes | Same signatures (keep the default, N3), results and grants. Existing `tripSave` and `comments` tests must pass unchanged (§11) |
| Home and bell between BL-02 and BL-05 | Yes | Filter plus correct wording, and no production grants |
| Everything else | Yes | As round 1 |

### Verdict

**Approve with changes.** The spec is technically ready. Before the CTO approves:
1. Alok confirms PRD addendum points 1–4 (P1), one line.
2. Optionally, the Tech Lead fixes N1 and N3 in the Appendix A text. They are small and can also be handled in BL-01's review.

### Tracker update (no Sheets tool used; for the CTO to apply)

- Once Alok's line is recorded: OQ-11 → `6. Spec approval (CTO)`, Owner `CTO`. Notes: "Plan review round 2: pass technically; N1, N3 to fold into BL-01."
- Until then: `Blocked`, Owner `Founder`. Notes: "Confirm PRD addendum points 1–4 (Changes after tech review, 23 Nov)."
