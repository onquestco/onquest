# Plan review: Blogs (OQ-11, spec PR #20), 2026-11-23

## Plan review: CHANGES NEEDED (round 1 of 3)

Reviewed: `docs/prds/blogs.md`, `docs/specs/blogs.md` (branch `spec/blogs`, head 919ab00), against `CLAUDE.md`, `docs/decisions/0001`/`0002`, `docs/03-security-visibility-seo.md`, and the code and migrations on `main` (a38a847, which has OQ-16; the spec branch doesn't have it yet, see T9).

The design is solid. The blog document model follows 0001. Every new table has RLS and no anonymous policy. The public functions keep their arguments and fields. The `/@h/blog/s` rewrite can't clash with Quest URLs. Rollback trade-offs are stated and signed off. What needs to change is small: 1 product item, 3 technical blocking items, and a set of should-fixes. Most of them are spec text that went stale when OQ-16 landed, or a task boundary that doesn't match the files a task has to touch.

---

### For the founder (product), owner Alok

1. **[Blocking] Three of the nine §14 answers contradict the approved PRD's text, so the PRD owner must confirm them and the PRD copy must change to match.** The CTO's OK covers the technical side, not the PRD owner's sign-off.
   - **Q2, two tabs.** PRD edge case: "The later save wins." Spec §3.2 keeps the save that reached the server *first*. The tab that saves later gets the conflict, and its unsaved text is lost when it reloads. This is the only design 0001 rule 4 allows, since a literal "later save wins" would silently overwrite. Confirm it, then reword the PRD edge case.
   - **Q4, unlisted link.** PRD B4 shows `onquest.in/@username/blog/blog-title`. Unlisted blogs will be `…/blog/goa-on-15k-k3f9x2` (docs/03 §A.1).
   - **Q1, likes copy.** PRD B5 still says "likes below 3 show 'Be the first to like this'". The 21 Nov decision replaced that (`features/trip-page/likeCopy.ts`). Update the PRD line.
   - Q3 and Q5–Q9 fill gaps rather than contradict the PRD. They can be confirmed in the same pass, one line each.
   - Why: the CTO approves a spec that has to be faithful to the PRD. Today, the UX tester would fail UX test 4, the B4 link and the two-tab case against the PRD's wording.

2. **[Should fix] An unlisted Quest linked from a public blog becomes discoverable.** PRD §Privacy says "A blog never makes a linked Quest more visible than it already is". The PRD edge case "Linked Quest is unlisted → readers … can open the Quest by it" contradicts that for public blogs.
   - What happens: a public blog is listed on the profile, feed, Explore, search and the sitemap. The `get_blog_quest` card puts the unlisted Quest's unguessable URL into indexed, crawlable HTML (spec §4.3, §7 "PRD-accepted").
   - Suggest one of these. (a) Readers of a *public* blog see the card only for *public* Quests; an unlisted blog can show an unlisted Quest. (b) Keep the current behaviour, and have the Link a Quest sheet say, for unlisted Quests: "Anyone who reads this blog can open this Quest."

3. **[Note] Email.** PRD Notify step 1 says likes and comments "send emails". Resend isn't set up, so at launch blogs notify through the bell only (spec §3.6). That is fine, but the founder should know before running UX tests.

### For the Tech Lead (technical)

**Blocking**

T1. **[Blocking] Route paths and the sign-in gate are stale after OQ-16** (spec §4.4, §12 BL-03/BL-04 "Touches", Appendix A).
- OQ-16 moved every signed-in route under `app/(app)/(signed-in)/`. The sign-in redirect moved from `app/(app)/layout.tsx` to `app/(app)/(signed-in)/layout.tsx`. `(create)` and `create/` now live in that group: `app/(app)/(signed-in)/(create)/…` and `app/(app)/(signed-in)/create/page.tsx`.
- The spec still places the composer at `app/(app)/(create)/blogs/…`, the owner view at `app/(app)/blogs/[key]/page.tsx`, and `/create` at `app/(app)/create/page.tsx`. Built literally, `/blogs/*` sits outside the signed-in layout: no `/login` redirect, no `(create)` layout or loading.
- Signed out, `/blogs/new` would call `has_feature_access`, which is granted to `authenticated` only, and error instead of redirecting.
- `NEEDS_ACCOUNT` in `features/account/signInPrompt.ts` has no `/blogs` pattern. Signed-out taps on `/blogs/…` links (feed card, "Continue editing" on a shared device) do a server redirect instead of opening the OQ-16 popup.
- Fix: put all `/blogs/*` routes under `app/(app)/(signed-in)/` (composer in `(signed-in)/(create)/blogs/…`, owner view in `(signed-in)/blogs/[key]/`). Add `/^\/blogs(\/|$)/` to `NEEDS_ACCOUNT` (BL-03 Touches). Correct the `/create` path.

T2. **[Blocking] BL-02's feed change breaks the Home feed until BL-05 ships, and its "Touches" list misses the files it has to change** (§4.1 `FeedPageSchema`, §6.3, §12).
- `FeedPageSchema.items` becomes a discriminated union, and `getFeedPage` switches to `list_home_feed` in BL-02. But `features/home/HomeFeed.tsx` also imports `FeedPageSchema`, which contradicts the spec's "only getFeedPage builds it; one place changes". `HomeFeed`/`FeedCard` (BL-05) render every item as a Quest.
- So BL-02 either fails typecheck or ships blog items that render as broken Quest cards.
- The same gap applies to notifications: between BL-02 and BL-05, blog rows show as "your Quest" linking to `/home`.
- §8 says "no blog UI is reachable until someone is granted access", but nothing stops a production grant after BL-03 deploys, and founders are the first grantees.
- Fix: (a) BL-02 also makes `HomeFeed.tsx` skip `type: 'blog'` items, and lists the file; BL-05 renders them. (b) State the rollout rule in §3.9 and `docs/runbooks/feature-access.md`: no production `grant_feature_access` until BL-05 is live; test on preview data before then.

T3. **[Blocking] BL-03 depends on BL-04 components that it doesn't declare** (§6.1 Preview, §12).
- BL-03 covers B6 (Preview), which "renders `BlogArticle`". `BlogArticle`, and the `BlogBody` and `BlogGallery` it is built from, are BL-04 files (`features/blogs/*`).
- BL-03 depends only on BL-01, so BL-03 and BL-04 can run in parallel. That means two builders touching the same files with no order, and BL-03 can't prove B6 by itself.
- "Update → goes to the blog page with Toast 'Blog updated.'" also needs BL-04's page.
- Fix: move `BlogArticle`, `BlogBody` and `BlogGallery` (plus `blogBody.test.ts` and `BlogArticle.test.tsx`) into BL-03, and have BL-04 build on them. Or make BL-03 depend on BL-04. The first keeps PR count and parallelism.

**Should fix**

T4. **[Should fix] A blog key can equal one of the writer's own Quest keys, and they share a storage folder** (§3.4 storage row, §4.3 `create_blog`).
- `create_blog` checks the key only against `blogs`/`blogs_archive`. Storage is `photos/{uid}/{key}/…` for both.
- A reused or crafted key makes `deleteBlog`'s `deleteQuestFiles('{uid}/{key}')` delete the Quest's photos, and the post-publish photo sweep remove them too (they are in neither the blog row nor its draft).
- Only the writer's own data is exposed, but the result is permanent photo loss.
- Fix: `create_blog` raises OQ410 if the key exists in `trips`/`trips_archive`. Ideally `create_trip` gets the reverse check in a later migration. Add both to `blogSave.test.ts`.

T5. **[Should fix] The comment rate limit is shared only one way** (§3.4 table, §4.3 `post_blog_comment`). `post_blog_comment` counts `comments` and `blog_comments`, but `post_comment` (migration 10) isn't replaced, so Quest comments don't count blog comments. Either replace `post_comment` too (same arguments, add a grants test) or reword "5 a minute across Quests and blogs".

T6. **[Should fix] Analytics can't measure two PRD metrics exactly** (§10).
- "Blog to Quest" is per view, but `blog_quest_opened` has no `view_id`. Add `view_id`, as `blog_read_end` has.
- `blog_create_started` has no `blog_id`, although §10 says every blog event carries one.
- `source: write_your_own` can't be reached: "Write your own" opens `/create`, whose link hardcodes `source=create`. Pass `/create?source=write_your_own` through.
- `create_option_tapped` isn't fired anywhere today: it exists only in `lib/analytics/taxonomy.ts`, not in `CreateChooser`. "As today, existing meaning" is wrong; it must be added.
- `blog_draft_saved` "once per calendar minute" needs a stated mechanism, because the action is stateless. For example, fire when `minute(basedOn) ≠ minute(now)`.

T7. **[Should fix] The docs this spec PR needs aren't written** (§16). The HLD caching table and tables, the LLD sections, docs/03 §A.1/§B.2 list/§C.1 (blog rows, the D9 profile rule) and the CLAUDE.md public-function list and cache-tag rule (D8) all change. The spec defers them all. They should be in this PR before the CTO approves, so builders and the next review check against current rules.

T8. **[Should fix] The 0001 retention amendment isn't recorded.** D5 and `blogs_archive` 180 days rely on "the 0001 retention amendment (C-A16)". `docs/decisions/0001` still says "archived published rows kept until the user deletes the trip" and lists retention as an open question. The current `run_retention_cleanup` already deletes at 180 days, so this is a known gap, not new to blogs. The CTO should write the amendment in `docs/decisions/` before more archive ages are added.

T9. **[Should fix] The spec branch isn't on `main`.** `spec/blogs` branches from 1877271, so it lacks OQ-16 (a38a847) and `20261123170844_15_open_home.sql`, while the spec says OQ-16 is merged. Rebase PR #20. Also remove the stale conditionals:
- BL-01 "Rebase on OQ-16 first if it has merged".
- BL-04 "else the `signInPath()` fallback".
- R1 "if OQ-16 lands first".

**Notes**

T10. Migration numbering is correct: `20261124100000_16_blogs.sql` and `20261124110000_17_blog_social.sql` follow `20261123170844_15_open_home.sql`. Migration 15 only changes grants, so none of the functions blogs replace were touched after migrations 12, 13 and 14. Base each replacement on these latest definitions:
- `get_profile`: migration 14.
- `search_public`: migration 13.
- `list_my_notifications`: migration 10.
- `delete_account_data`, `list_pending_deletions`, `list_sitemap_profiles` and `run_retention_cleanup`: migration 12.

T11. Replacing `delete_account_data` in migration 16 is required, and the spec is right about why. It ends with `delete from public.profiles`, and the deferred `blogs.owner_key` FK would fail at commit otherwise. `list_pending_deletions` must also check `blogs`, `blogs_archive` and `blog_drafts`, or a half-finished deletion of a blogs-only user drops off the daily job. The spec says "replaced"; make the check explicit in the BL-01 acceptance criteria.

T12. Deploy-skew, accepted risk: an open tab from the previous build that loads more of the feed through `/api/feed` will fail to parse blog items with the old `FeedPageSchema`. T2's rollout rule avoids this in practice. On rollback, `list_sitemap_profiles` lists blogs-only profiles that old metadata marks `noindex`. That is harmless.

T13. There is no runbook for applying migrations in production. The "migration first, then code" order (§8) is manual. Say who runs it and when, in the PR or a runbook.

T14. §4.3 says `get_blog` never returns "save metadata", but `BlogRowsSchema` has `saved_at`, and public `BlogCard`s carry `savedAt`. That is harmless, the same as Quests, but make the wording consistent.

T15. BL-02 is very large (migration 17 with about 20 functions, readers, email and taxonomy). That is acceptable under the deploy cap, but review time will be long. Splitting the migration 17 SQL and its DB tests into their own commits inside the PR would help.

T16. Sign-out clears `oq_blog_draft:*` from localStorage, but pending photos stay in IndexedDB (`onquest-uploads`). Quests behave the same today. Worth knowing for shared phones.

---

### Coverage

| PRD criterion | In spec? | Implemented by | Tested by |
|---|---|---|---|
| B1 Create → composer, cursor in Title | Yes | `CreateChooser` + `/blogs/new` | `CreateChooser.test.tsx`, Playwright 1 (iOS keyboard caveat R5) |
| B2 title only → message | Yes | `canPost()`, `publish_blog` `empty` | `postRules.test.ts`, `blogSave.test.ts` |
| B2 120-char paste → 100 | Yes | `TitleField` | `titleField.test.ts` |
| B3 11th photo refused | Yes | `addPhotos()`, `save_blog_draft` | `photoRules.test.ts`, `blogSave.test.ts` |
| B3 reorder → cover | Yes | `PhotoRow`, `blog_card_json` | `photoRules`, `blogCards` |
| B4 link Goa Quest | Yes | `LinkQuestSheet`, `publish_blog`, `get_blog_quest` | `blogSave`, `blogAccess` |
| B4 no Quests → empty state | Yes | `LinkQuestSheet` | `LinkQuestSheet.test.tsx` |
| B5 draft survives close | Yes | autosave + local backup + `list_my_blogs` | `blogDraftSaver`, `blogAccess`, Playwright 2 |
| B6 Preview | Yes | `BlogArticle` preview mode | `BlogComposer.test.tsx` (task boundary: T3) |
| B7 unlisted | Yes | `get_blog` + public-only lists | `blogAccess`, `blogDiscovery` |
| B7 private | Yes | `get_blog_status`, `BlogUnavailable` | `blogAccess` |
| B8 4G read signed out | Yes | cached SSR page | `metadata.test.ts`, Playwright 3, Lighthouse in BL-04 |
| B9 View Quest, Back keeps place | Yes | `<Link>`, scroll restore | Playwright 3 (≤ 50 px) |
| B9 Quest made private/deleted | Yes | `get_blog_quest`, `blogQuestsTag`, `/me` | `blogAccess`, `refreshTrip.test.ts` |
| B10 like after sign-in | Yes | OQ-16 popup + `questIntent` | `questIntent.test.ts`, Playwright 4 |
| B11 delete → "removed" | Yes | `delete_blog` tombstones | `blogDelete.test.ts` |
| B11 comments off | Yes | `set_blog_comments`, `get_blog_social` | `blogSocial.test.ts` |
| B12 Aman 2 public + 1 unlisted | Yes | `get_profile.blogs` | `blogDiscovery.test.ts` |
| B13 bell within 1 min | Yes | same-transaction insert; the bell polls every 30 s (`BellBadge.tsx`) | `notifications.test.ts`, `notificationText.test.ts` |
| S1, S2, S3 | Yes | `search_text`, `list_home_feed`, `list_explore_blogs`, `search_public` | `blogDiscovery`, `feed` |
| Edge cases (12) | Yes, all | §2 rows | §2 rows; the two-tab case also in UX test 6 |

Every PRD criterion is mapped with code and a test. The only weak spot is the B6 task ownership (T3).

### Security and privacy

| Rule | Planned correctly? | Notes |
|---|---|---|
| RLS on every new table, owner-only, DB test | Yes | 10 tables. `blog_comments` has no policy, like `comments`. `removed_blog_urls` and `feature_access*` have no client grants |
| No anonymous `select` policy | Yes | All public reads through security-definer functions with explicit fields |
| Function grants (migration 11 pattern) | Yes | `grants.test.ts` extended. `grant_/revoke_feature_access` service_role only. `has_feature_access` authenticated (see T1 for the signed-out call) |
| Writes only via `action()` + zod + `getUser()` | Yes | §4.2 |
| No `dangerouslySetInnerHTML`; JSON-LD escapes `<` | Yes | `BlogBody` builds text nodes and `<a>` for `https?://` only |
| No photo GPS | Yes | Worker reused, GPS dropped in `onProcessed`, no coordinates in `BlogPlaceSchema` |
| Secret key only in admin client | Yes | Existing uses only |
| No logging of user text, emails or URLs | Yes | `chars_bucket`/`length` only |
| Unlisted unguessable | Yes | 6-char suffix at first publish. Public → unlisted keeps the guessable URL, the same as Quests (docs/03 §A.1) |
| Linked Quest never more visible | Partly | See founder item 2 |
| Private keys don't leak | Yes | `get_blog_status` returns the word only. `/api/unavailable-blog` uses an RLS read |
| Cache tags on every write | Yes | `blog-url`, `blog-social`, `blog-quests`, profile, explore. Old and new handles on profile save and deletion |
| SEO index rules, sitemap | Yes | ≥ 80 words, unlisted `noindex,nofollow`, `/blogs` and `/b/` disallowed. D9 signed off (docs/03 update pending, T7) |
| Account deletion (DPDP) | Yes | Rows, archives, likes, comments, files. Tombstones and handle claims kept, as for Quests (T11) |
| Feature flag not self-grantable | Yes | No client grants, DB check in `create_blog` |
| Storage folder isolation | Partly | T4 |

### No in-place updates

| Record | Key | Save function | Conflict check | User delete | OK? |
|---|---|---|---|---|---|
| Blog draft | `blog_drafts.key` | `create_blog`, `save_blog_draft` | draft `saved_at` | `delete_blog` / `delete_account_data` hard-delete live + archive | Yes |
| Blog (live) | `blogs.key` | `publish_blog`, `set_blog_visibility`, `set_blog_comments` | live `saved_at` (publish checks both) | same | Yes |
| Blog like / comment | `blog_likes.key`, `blog_comments.key` | `set_blog_like`, `post_blog_comment`, `delete_blog_comment` | none (set-state, as Quests) | deleted with the blog or the account | Yes |
| Notification | `notifications.key` | insert-only, inside the like/comment functions | n/a | yes | Yes. `alter table add column` is a schema change, not a row update |
| Feature access | `feature_access.key` | `grant_`/`revoke_feature_access` (revoke archives, no successor) | none (admin) | n/a | Yes |
| Removed blog URL | `url_hash` | insert-only | n/a | kept, like Quest tombstones | Yes |

No `.update()`, `.upsert()`, update grant or policy, or `updated_at` trigger is proposed. `noUpdates.test.ts` is extended to every new table. Retention ages depend on the unrecorded 0001 amendment (T8).

### Backward compatibility

| Area | Safe? | Notes |
|---|---|---|
| `trips.content`, Quest drafts | Yes | Not touched |
| Migrations additive, rollback-safe | Yes | New tables. Nullable `notifications.blog_key` with a check. Replaced functions keep arguments, grants and fields. `list_feed` kept |
| `get_profile`, `search_public`, `list_my_notifications`, `list_sitemap_profiles`, `delete_account_data` | Yes | Only additive keys. Current zod schemas strip unknown keys (checked `NotificationItemSchema`, `SearchResultsSchema`, `accountDeletion.ts` `ResultSchema`). Old-schema parse tests planned |
| `run_retention_cleanup`, `list_pending_deletions` | Yes | Same signatures. Base on migration 12 (T10) |
| Public URLs | Yes | `/@h/blog/s` has 3 segments and `:slug` matches 1. A Quest slugged `blog` keeps working. `blog` reserved only for new first publishes. No handle reserved |
| Existing trip rendering | Yes | Templates, jitter and defaults untouched |
| Storage paths | Yes | Same paths and variants. Folder-collision gap in T4 |
| Cache tags, env vars, actions | Yes | New tags only; `refreshQuestPages` adds one. No env change |
| Analytics | Yes | New events. `quest_draft_created.source` and `notification_sent.target` additive |
| Deploy order | Partly | Migration-before-code is stated, but there's no runbook (T13). Rollout must wait for BL-05 (T2) |
| Previous release on rollback | Accepted | Blog URLs 404, and blog notifications show as "your Quest" (R4, CTO signed off 23 Nov) |
| Migration numbering | Yes | 16 and 17 after `20261123170844_15_open_home` |

### Spec assumptions about existing code, checked on `main`

All of these exist on `main`:
- **Frontend:** `likeLabel()` (`features/trip-page/likeCopy.ts`), `askToSignIn()` (`features/account/signInPrompt.ts`), `SignInSheet` (`features/account/SignInSheet.tsx`, opens for `/login` links), `readQuestIntent`/`intentStep`/`withoutIntent`, `ShareLinkButton`, `PublishedAgo`, `FollowButton`, `getMovedHandle`.
- **Editor and upload:** `features/editor/draftSaver.ts`, `firstPublishSlug`/`unlistedSlug`/`RESERVED_SLUGS`, `createUploadQueue`/`MAX_ATTEMPTS`, `photoSweep`, `deleteQuestFiles`/`deleteUserFiles`, `geocoderFor`.
- **Server, email and cache:** `notifyByEmail`/`notifyQuestOwner`, `refreshQuestPages`, `refreshAfterProfileSave`, `tagsToRefresh`, `previewCoverUrl`/`QuestPreviewImage`, `isBot`.
- **Database functions:** `quest_card_json`, `quest_score`, `set_like`, `post_comment`, `get_trip_social`, `get_my_follow_state`, `resolve_handle`, `raise_missing`, `trip_url_hash`.
- **Design-system components:** `Sheet`, `Segmented`, `Switch`, `ProgressRing`, `ConfirmDialog`, `TopBar`, `Chip`, `Avatar`, `Toast`.

These assumptions are wrong:
- The route paths (T1).
- "Only getFeedPage builds `FeedPageSchema`" (T2).
- "`create_option_tapped` as today" (T6).
- `robots.ts` is `app/robots.ts`.

### Verdict

**Changes needed.** Before the CTO approves:
1. Alok confirms §14 Q1, Q2 and Q4 (and the other six), and the PRD copy is updated.
2. The Tech Lead fixes T1 (route paths, `NEEDS_ACCOUNT`), T2 (BL-02 feed handling, no production grants before BL-05) and T3 (BL-03/BL-04 component ownership).
3. The Tech Lead adds T4–T9 to the spec. They are small text edits, apart from writing the docs updates (T7) and the 0001 amendment (T8).

Round 2 can be a short diff review.

### Tracker update (no Sheets tool used; for the CTO to apply)

- OQ-11 row: `Blocked`, Owner `Founder`. Notes: "Plan review round 1: 1 product blocking (confirm §14 Q1, Q2, Q4 + Q3, Q5–Q9; update PRD copy), 3 technical blocking (T1–T3) for the Tech Lead."
- Once Alok answers: back to `4. Tech spec`, Owner `Tech Lead agent`, for T1–T9.
