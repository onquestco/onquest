# Spec: Blog editor toolbar + delete drafts

| | |
|---|---|
| PRD | `docs/prds/2026-11-blogs-editor.md` (QuestLog OQ-26, OQ-25; prioritised by the CTO 25 Nov 2026). Addendum to `docs/specs/blogs.md` |
| Status | Draft |
| Build mode | Backend + Frontend split (BL-06 backend; BL-07 single builder, frontend; BL-08, BL-09 frontend) |
| Tracker IDs | OQ-25, OQ-26 · BL-06 #40, BL-07 #41, BL-08 #42, BL-09 #43 |

**Readiness.** The tickets have testable acceptance criteria and out of scope. They have no metric, states or UX test plan; this spec fills the states (§6), UX tests (§11) and the delete copy, which the brief left to the Tech Lead. Nothing blocks the build. **D1 decided 25 Nov 2026 by the CTO: option A** (read every body as the new format; the prod count found 2 bodies with block syntax, accepted as intended lists). The spoiler stays in scope.

**No migration.** Neither ticket needs a migration or any change to RLS, grants or functions, provided the CTO picks D1 option A (recommended). Option B needs migration 18.

## 1. Summary

Writers get a toolbar above the blog body. It writes a small Markdown-style subset into the existing `body` string. One pure parser in `lib/blog/markdown.ts` turns the body into blocks, and one renderer turns those into React elements, both in Preview and on the blog page. Writers can also delete a draft that has never been posted, from ⋯ on its row. This uses the existing hard delete (`delete_blog`), which already removes the live rows, the archived rows and, through the action, the photo files.

## 2. Acceptance criteria map

| PRD criterion | Satisfied by | Proved by |
|---|---|---|
| OQ-26 every option works | `formatCommands.ts` (pure), `FormatToolbar.tsx`, `LinkSheet.tsx` | `formatCommands.test.ts`; UX 1 |
| Renders the same in Preview and the published page | Both render `BlogBody` from `parseBlogBody()` (`BlogArticle` is already shared) | `markdown.test.ts`; `BlogBody.test.ts` (renders the fixture body) |
| Survives save, reload, publish | Markers live in `body`, which is saved and copied by publish unchanged | `blogSave.test.ts` existing round trip + new case with markers; Playwright step |
| Mobile: scrolls, targets ≥ 40px | Toolbar is one `overflow-x-auto` row, buttons `size-11` (44px) | UX 3 |
| Safe subset only | Parser returns typed nodes; renderer makes elements only; links only `http(s)` with `rel="nofollow ugc noopener"` | `markdown.test.ts` hostile inputs; `BlogBody.test.ts` |
| Existing plain-text blogs unchanged; body shape unchanged | `body` stays `string` ≤ 10,000; same paragraph and line-break rules; D1 | `markdown.test.ts` old-shape fixtures; D1 check |
| Toggle, active state, tooltips with shortcut | `activeFormats()`, `toggle*()`; `title` / `aria-label` / `aria-pressed` | `formatCommands.test.ts`; UX 1 |
| Lists continue on Enter; empty item exits | `continueList()` | `formatCommands.test.ts` |
| Paste rich text → plain text | The body is a `<textarea>`, which only receives `text/plain` | UX 1 (paste from a web page) |
| Body limit, markers count? | §4.1: markers count; limit stays 10,000 | `formatCommands.test.ts` (`too_long`) |
| OQ-25 delete a draft blog | `deleteBlogDraft` + `ManageDraftSheet` | `deleteBlogDraft.test.ts`; `blogDelete.test.ts` existing never-posted case |
| Photos, cache tags, analytics, confirm copy | §4.2, §6.3, §10 | `deleteBlogDraft.test.ts` |
| Published blogs unchanged | `deleteBlog` and `ManageBlogSheet` untouched; `deleteBlogDraft` refuses posted blogs | `deleteBlogDraft.test.ts` |

## 3. Approach

**Formatting.** The body stays one string with the same rules: blank lines split blocks, and a single `\n` is a line break. A small subset of Markdown is read on top (§4.1). We write our own parser instead of adding a library: the subset is small, the guides already do this (`features/guides/guideBlocks.ts`), and Reddit-style spoilers and line breaks aren't standard CommonMark. Every node is plain text by construction, so nothing a writer types can become HTML. `BlogData` gains `blocks`, `BlogBody` renders them, and `BlogPreview` builds them from the local draft with the same function. The toolbar is a set of pure text transforms over `(body, selection)`, kept separate from the parser. It reads the parser's inline ranges for its active state, so the editor and the renderer agree.

**Delete a draft.** "Draft" means `blogs.status = 'draft'`: the blog has never been posted. A posted blog with unposted edits is `published`, and its ⋯ menu stays as it is today. A user deleting their own blog falls under decision 0001 rule 7 (a user's delete is a hard delete), the same class as trip deletion. `delete_blog` already does this for blogs that were never posted (`tests/db/blogDelete.test.ts`, "leaves no tombstone for a blog that was never posted"). The new action is `discardBlogDraft` plus analytics and a guard for posted blogs.

## 4. Contract

### 4.1 Data shapes

No stored shape changes. `BlogDocumentSchema.body` stays `upTo(10_000).default('')`. Markers are part of the stored text, so **they count toward the 10,000 limit**, as the database `char_length` check already counts them (code points). The limit is not narrowed or widened. A toolbar action that would go over it is refused (§6.1).

`lib/blog/markdown.ts` (new, pure, no React):

```ts
/** from/to: UTF-16 offsets within the line, markers included (for the editor's active state). */
export type BlogInline =
  | { kind: 'text'; text: string; from: number; to: number }
  | { kind: 'code'; text: string; from: number; to: number }
  | { kind: 'bold' | 'italic' | 'strike' | 'spoiler'; children: BlogInline[]; from: number; to: number }
  | { kind: 'link'; href: string; children: BlogInline[]; from: number; to: number };
export type BlogLine = BlogInline[];
export type BlogBlock =
  | { kind: 'paragraph'; lines: BlogLine[] }
  | { kind: 'heading'; level: 1 | 2 | 3; line: BlogLine }
  | { kind: 'quote'; lines: BlogLine[] }
  | { kind: 'list'; ordered: boolean; start: number; items: BlogLine[] };

export function parseBlogBody(body: string): BlogBlock[];
export function parseBlogLine(line: string): BlogLine;
/** Markers removed, spoilers replaced by "(spoiler)". `cut`: the text was cut short, so an unclosed `>!` hides the rest. */
export function blogPlainText(text: string, options?: { cut?: boolean }): string;
```

Grammar (exact; anything else is literal text):

| Syntax | Where | Notes |
|---|---|---|
| `# `, `## `, `### ` + text | line start, no leading spaces | One line. Rendered as `h2`/`h3`/`h4`: the page's only `h1` is the title. `#` with no space (`#1 tip`) is text |
| `- ` or `* ` | line start | Bullet item. Consecutive item lines of one kind form one list. A blank line or any other line ends it |
| `1. ` (1 to 9 digits, `.`, space) | line start | Numbered item. `start` = the first item's number; later numbers are ignored |
| `> ` or a line that is just `>` | line start, not `>!` | Consecutive lines form one quote, each a line |
| `**x**` · `*x*` · `~~x~~` · `>!x!<` | inline | Opening marker followed by a non-space, closing marker preceded by a non-space, not empty, within one line. They can nest, except inside code. Unmatched markers are text. No `_` italics (snake_case and old text) |
| `` `x` `` | inline | Content is literal; parsed first |
| `[text](url)` | inline | Only when `url` passes `isWebUrl` (http/https, host with a dot); otherwise the whole thing is text. `url` may hold balanced parentheses (`…/Goa_(state)`). `![…](…)` is text (no images) |
| bare `http(s)://…` | inline | Linked as today (`lineParts`), as one unit after code: markers never cut a URL. Trailing `*`, `~` and an unmatched `)` are left out of it |

No HTML, no backslash escapes, no tables, no images, no nested lists. Parsing is linear: no regex that can backtrack badly. A 10,000-character hostile body must parse in under 50 ms (test).

`lib/blog/schema.ts`: `BlogData` gains `blocks: BlogBlock[]` (built in `toBlogData()`). BL-08 removes `paragraphs` once nothing reads it. `toParagraphs` stays until then.

`features/blogs/linkParts.ts` moves to `lib/blog/linkParts.ts` (lib can't import features) and exports `isWebUrl`.

### 4.2 Server actions

| Action | Input (zod) | Result data | Errors | Cache tags refreshed |
|---|---|---|---|---|
| `deleteBlogDraft` (new, `features/blog-editor/actions.ts`) | `z.object({ key: z.uuid() })` | `{ deleted: true }` | `not_found` (not yours, or already gone), `published` (posted, use ⋯ Delete) | None in the normal case (see below) |

Steps:
1. `loadOwnBlog(db, key)`: null → `not_found`; `blog.status === 'published'` → `published`.
2. `deleteQuestFiles(db, '{uid}/{key}')`: both buckets, files first (the `deleteBlog` order).
3. `db.rpc('delete_blog', { p_key: key })`: OQ404 → `not_found`; any other error throws.
4. If the returned `slug` is null (never posted, the normal case): no cache tags. A blog that was never posted is on no cached page: profiles, feed, Explore and search list posted blogs only, and own lists (`getMyBlogs`) are never cached. Then `trackServer('blog_deleted', …)` in `after()`.
5. If `slug` is non-null, the draft was posted on another device between steps 1 and 3. `delete_blog` has already tombstoned it correctly, so this was a normal owner delete: call `refreshBlogPages({ ownerKey, blogKey, handles, slugs: [slug] })` and track `blog_managed { action: 'delete' }`, as `deleteBlog` does. Return `{ deleted: true }`.

`discardBlogDraft` (empty composer close), `deleteBlog` and the other actions don't change. The builder may extract the shared steps 1 to 3 into one helper, since this is the second copy.

### 4.3 Public reads

None. `get_blog` and the others are unchanged. `body` is still returned as text.

### 4.4 Routes

No new routes. `/blogs/new` and `/blogs/[key]/edit` get the toolbar. `/@handle/blog/slug` renders blocks. Metadata: `blogDescription()` uses `blogPlainText()`. Index rules don't change.

## 5. Database and storage

- **Migration: none** (with D1 = A). `delete_blog` (migration 17 version) already hard-deletes `blogs`, `blogs_archive`, `blog_drafts`, `blog_drafts_archive`, likes, comments and notifications in one transaction. It writes no tombstone when `published_at` is null.
- Decision 0001: the delete is rule 7 (user delete = hard delete), not archiving. Nothing is archived and no `saved_at` is passed, as with `deleteBlog` and `deleteQuest`. A stale composer tab's next autosave gets `not_found` and shows the existing `LostBlog` screen. Retention has nothing left to clean.
- RLS, grants: unchanged. No new table.
- Tests: `blogDelete.test.ts` already covers a never-posted delete. BL-07 adds a case: a draft with two autosaves (so `blog_drafts_archive` has rows) → every table empty for the key, no tombstone.
- Storage: `{uid}/{blogKey}/` in both buckets, removed by `deleteQuestFiles`. Paths unchanged.

## 6. Frontend

### 6.1 Toolbar (BL-09, `features/blog-editor/`)

- `FormatToolbar.tsx`: one row above `BodyField`, `overflow-x-auto`, sticky under `ComposerTopBar` while the body has focus, hidden in Preview. Buttons, in order: Bold, Italic, Strikethrough, Code, H1, H2, H3, Bulleted list, Numbered list, Quote, Link, Spoiler, Undo, Redo. Each is `size-11` (44px) with an icon from `design-system/components/icons.tsx` (new icons added there, with no new tokens), `aria-label` and `title` = name + shortcut ("Bold (Ctrl+B)", "Bold (⌘B)" on Apple devices), and `aria-pressed` for the active state. `onMouseDown` calls `preventDefault` so the textarea keeps its selection.
- Shortcuts on the textarea: ⌘/Ctrl+B bold, +I italic, +Shift+X strikethrough, +E code, +K link, +Z undo, +Shift+Z and Ctrl+Y redo.
- `formatCommands.ts` (pure, `(body, selection) → { body, selection } | { error: 'too_long' }`):
  - Inline (bold, italic, strike, code, spoiler): with a selection, trim surrounding spaces off it, then unwrap if it's already wrapped by that marker (inside or just outside), else wrap. A selection across lines wraps each non-empty line. With no selection: inside a run of that kind → remove that run's markers; else insert the pair with the cursor between.
  - Line (H1–H3, bullet, numbered, quote): applies to every line the selection touches. If all of them already have that prefix → remove it; else replace any other block prefix with it. Numbered lines are numbered 1, 2, 3…
  - `continueList(body, cursor)` on Enter: on an item with text, insert `\n- ` (or `\n{n+1}. `); on an empty item, remove the marker and leave an empty line (exit the list). Anywhere else Enter is native.
  - `activeFormats(body, selection)`: the kinds whose `parseBlogLine` range contains the cursor, plus the line's block kind.
  - Over 10,000 code points → `too_long`; the body doesn't change, and a toast says "Not enough room for formatting. Blogs can be up to 10,000 characters."
- Undo/redo: our own history in `useBodyHistory.ts`, because a controlled textarea loses the browser's undo stack once code sets its value. It keeps `{ body, selection }` snapshots, at most 100, in memory only. A new snapshot is taken on every toolbar command, and typing is merged into one step per pause of 1 s or more. Undo and redo call `store.change()`, so they autosave like typing.
- `LinkSheet.tsx` (`Sheet` + `TextField`): fields "Link" (`inputMode="url"`) and "Text" (filled from the selection). It validates with `isWebUrl`; the error is "Enter a link starting with http:// or https://". With the cursor in a link, it opens filled in and offers "Remove link" (the text is kept). Empty text uses the URL.
- Paste: unchanged. A textarea only takes plain text.

### 6.2 Rendering (BL-08, `features/blogs/`)

- `BlogBody.tsx` takes `blocks`: `p` with `br` between lines (as today), `h2`/`h3`/`h4`, `blockquote`, `ul`/`ol start`, `strong`, `em`, `s`, `code`, links (`target="_blank" rel="nofollow ugc noopener"`, href from the parser only). Type styles come from existing tokens. If none fits, that's a design-system change first.
- `BlogSpoiler.tsx` (`'use client'`, the only client part): a `button` with `aria-expanded`, covered until tapped (colours from tokens), and its text server-rendered.
- `BlogArticle`, `BlogPreview` (`previewArticle` → `blocks: parseBlogBody(document.body)`) and `BlogView` switch to `blocks`. Card excerpts (`lib/social/cardRows.ts` / `lib/blog/cards.ts` mapping) go through `blogPlainText(…, { cut: true })` and `blogDescription()` through `blogPlainText(…)` (BL-06), so cards and link previews never show `**` or a spoiler.
- `blogDescription()` doesn't use `cut`: it reads the whole body, where an unclosed `>!` is literal text the page itself shows (BL-06 review round 1, Q3).

### 6.3 Delete a draft (BL-07)

- `BlogList` (own lists only: the Quests tab and your own profile): draft rows get ⋯ too (`onManage`). It opens `ManageDraftSheet.tsx`, titled with the draft's title ("Untitled blog" if none), with two actions: "Continue editing" (link to `/blogs/{key}/edit`) and "Delete draft" (danger).
- Confirm (`ConfirmDialog`): title **"Delete this draft?"**, message **"It hasn't been posted, so no one else has seen it. Its text and photos will be deleted. This can't be undone."**, confirm **"Delete draft"** ("Deleting…" while busy), cancel as the dialog's default.
- Success, or `not_found` (already gone): remove the row, toast **"Draft deleted."**, clear this device's local copy (`removeLocalDraft(storage, key)`, `forgetNewBlogKey(storage, key, ownerKey)`), then `router.refresh()`. Empty list → the existing `NoBlogsYet`.
- `published`: toast **"This blog was posted on another device. Showing the latest."**, then `onReload()`.
- Failure: **"Couldn't delete the draft. Try again."** inside the sheet.
- Published rows keep `ManageBlogSheet` as it is.

## 7. Security and privacy

| Rule | Applies? | How the design meets it |
|---|---|---|
| No `dangerouslySetInnerHTML` with user text | Yes | The parser returns typed nodes; the renderer builds elements; text goes in as text nodes. No HTML path exists. The test renders `<script>`, `<img onerror>` and `<style>` bodies and finds them as text |
| Links only http(s), `rel=nofollow ugc noopener` | Yes | `isWebUrl` checks the parsed URL's protocol and host; `javascript:`, `data:` and relative links stay text |
| JSON-LD escapes `<` | No change | JSON-LD carries no body |
| Owner-only writes, `action()`, `getUser()` | Yes | `deleteBlogDraft` uses `action()`; `delete_blog` checks `owner_key = auth.uid()` |
| User delete removes rows, archives, files (0001 rule 7, DPDP) | Yes | §4.2 steps 2 and 3 |
| Don't log user text | Yes | `blog_deleted` carries counts only; errors log the error name only |
| Spoilers don't leak in previews | Yes | `blogPlainText` replaces them in descriptions and excerpts |
| New table / RLS / anon select | No | None |

## 8. Backward compatibility

| Area | Impact | How it stays compatible | Test |
|---|---|---|---|
| Stored blog body (live, drafts) | Read as Markdown subset | Same string, same limit. Paragraph and line-break rules are kept. Syntax was chosen to be rare in plain text (no `_`, no escapes, `#` needs a space). D1 covers the rest | `markdown.test.ts` old-shape fixtures: plain bodies render the same paragraph/line/link tree as `toParagraphs` + `lineParts` |
| Drafts in progress | None | Unchanged document; a writer sees the formatted result in Preview | — |
| Migrations | None | — | — |
| Archived rows | None | Never rendered publicly; the same parser if they are | — |
| Public functions | None | `get_blog` unchanged | — |
| Public URLs, OG | Description text | `blogPlainText` instead of joined paragraphs; same for plain bodies | `metadata.test.ts` |
| Quests, templates | None | Not touched | — |
| Storage | None | Paths unchanged | — |
| Actions, tags, events | Added `deleteBlogDraft`, `blog_deleted` | Existing ones unchanged | — |

Deploy order: any order (no migration). Rollback: the previous release shows markers as literal text (`**Day 1**`). It stays readable and safe, and nothing is lost.

## 9. Performance and cost

The parser is linear, server-side on the blog page and client-side in Preview, with no new dependency. One small client component (spoiler). No new service or storage cost; deleting drafts frees storage.

## 10. Analytics

New server event **`blog_deleted`** (`trackServer`, in `after()`), fired only by `deleteBlogDraft` when the blog was never posted:

| Property | Type | Values |
|---|---|---|
| `blog_id` | string | blog key |
| `status` | string | `draft` |
| `photos` | int | photos on the draft |
| `chars_bucket` | string | `charsBucket(body)` |
| `has_quest` | bool | a Quest was linked |

A posted blog's delete stays `blog_managed { action: 'delete' }`. The empty-composer discard sends no event. BL-07 adds the rows to `docs/analytics/server-events.csv` and `change-log.csv`, after the OnQuest Taxonomy sheet (source of truth) is updated.

## 11. Test plan

- Unit: `lib/blog/markdown.test.ts` (every syntax row, unmatched markers, nesting, code literal, hostile HTML, `javascript:` links, 10,000-character timing, old plain bodies equal to the old tree, `blogPlainText` incl. a cut spoiler); `formatCommands.test.ts` (wrap/unwrap/insert, multi-line, line prefixes, list continue/exit, active state, `too_long`); `useBodyHistory` logic as a pure reducer test; `BlogBody.test.ts` (rendered markup, link `rel`, no raw HTML); `deleteBlogDraft.test.ts` (mocked db: refuses published, files before rpc, no tags + `blog_deleted` for a draft, tags + `blog_managed` when the returned slug is non-null).
- Database: `blogDelete.test.ts` + draft with archived autosaves → all four tables empty, no tombstone. `blogSave.test.ts` + a body with markers saves and publishes byte-for-byte.
- Backward compatibility: plain-text fixtures from `blogFixture.ts` and `blogCardFixture.ts` render unchanged.
- Playwright (in BL-09): extend the blog flow: type, bold a word, add a list, Post, open logged out → `strong` and `li` present; then delete a second, unposted draft from the Quests tab.
- Human UX (Vercel preview, phone and laptop):
  1. Use every button with and without a selection, every shortcut, toggle off, see the active states; paste from a web page → plain text.
  2. Save, reload, Preview, Post → identical formatting in all three.
  3. Phone: the toolbar scrolls and every target is easy to tap; the keyboard doesn't hide the body.
  4. An existing plain blog looks the same as before.
  5. Delete a draft from the Quests tab → copy as §6.3, gone after reload, the old composer tab shows "lost".

## 12. Tasks

| ID | Owner | Task | Touches | Covers ACs | Depends on | Done when |
|---|---|---|---|---|---|---|
| BL-06 | backend | Markdown subset parser and plain text | `lib/blog/markdown.ts` (+test), `lib/blog/linkParts.ts` (moved from `features/blogs/`, + its test, import in `BlogBody.tsx`), `lib/blog/schema.ts` (`BlogData.blocks`), `lib/blog/toBlogData.ts` (+test), card excerpt mapping (`lib/social/cardRows.ts` / `lib/blog/cards.ts`), `features/blogs/metadata.ts` (+test), `tests/db/blogSave.test.ts` (marker case) | Safe subset, old blogs unchanged, renders the same (data side) | — | §4.1 grammar fully tested, old-shape fixtures pass, CI green |
| BL-07 | frontend (single builder) | Delete a draft | `features/blog-editor/actions.ts` (`deleteBlogDraft` + `deleteBlogDraft.test.ts`), `features/blogs/BlogList.tsx`, `features/blogs/ManageDraftSheet.tsx`, `tests/db/blogDelete.test.ts` (one case), `docs/analytics/*.csv` | OQ-25 all | — | §6.3 copy and states, `blog_deleted` fires, tests pass |
| BL-08 | frontend | Render formatting | `features/blogs/BlogBody.tsx` (+`BlogBody.test.ts`), `BlogSpoiler.tsx`, `BlogArticle.tsx`, `BlogView.tsx`, `BlogPageArticle.tsx`, `features/blog-editor/BlogPreview.tsx`, `blogFixture.ts`; remove `BlogData.paragraphs` + `toParagraphs` when unused | Renders the same in Preview and the page; safe subset | BL-06 | Preview and the page render every block and inline kind; plain blogs unchanged |
| BL-09 | frontend | Toolbar, shortcuts, lists, link, undo/redo | `features/blog-editor/{FormatToolbar,LinkSheet}.tsx`, `formatCommands.ts` (+test), `useBodyHistory.ts` (+test), `TitleField.tsx` (`BodyField`), `BlogComposer.tsx`, `design-system/components/icons.tsx` (new icons only), Playwright blog spec | Every option, toggle/active, tooltips, lists, paste, mobile, limit | BL-06 (parser for active state); merges after BL-08 | §6.1 behaviour tested; Playwright step passes; UX 1–3 ready |

BL-06 and BL-07 can start now. BL-08 and BL-09 start against §4.1 and merge after BL-06.

## 13. Decisions

| Decision | Options considered | Choice | Reason | Needs CTO sign-off? |
|---|---|---|---|---|
| D1 Old plain blogs under the new parser | A: parse every body; before BL-08 merges, run the read-only count query below on prod; if it's 0, nothing changes for anyone. B: a `body_format` column (`plain`/`markdown`) on four tables + replaced save/publish/`get_blog` functions (migration 18) | A, falling back to B if the count is not 0 | Blogs are 2 days old and behind feature access, so there are very few bodies. B is a large migration to protect text that probably doesn't exist. After the launch, every body is written with the toolbar in view | **Yes** |
| D2 Parser | Library (react-markdown + remark-gfm/breaks + a spoiler plugin) vs. our own | Our own | Small subset, no HTML path at all, keeps `\n` as a line break, spoilers, no dependency, same code on server and client | No |
| D3 Italic marker | `*` and `_` vs. `*` only | `*` only | `_` breaks snake_case and old text | No |
| D4 Heading levels | `#` → `h1` vs. `h2` | `h2`–`h4` | One `h1` per page (the title), better for SEO and screen readers | No |
| D5 Undo/redo | Native (`execCommand`) vs. our own history | Our own | Controlled textarea; `execCommand` is deprecated and inconsistent on iOS | No |
| D6 Markers and the limit | Count them vs. exclude them | Count | The database already counts the stored string; excluding them would need a migration and two different counts | No |
| D7 Delete guard | TS status check vs. a new `delete_blog_draft` SQL function | TS check + handle a returned slug | No migration; the rare race ends as a correct owner delete with a tombstone | No |
| D8 Spoiler | Include vs. drop ("optional") | Include, last in BL-09 | Cheap; the founder can cut it without affecting the rest | No |

D1 query (counts only, no text leaves the database):

```sql
select count(*) filter (where body ~ '(^|\n)(#{1,3} |[-*] |[0-9]{1,9}\. |>)') as block_syntax,
       count(*) filter (where body ~ '\*\*|\*[^\s*]|~~|`|>!|\[[^]]+\]\(') as inline_syntax
from (select body from public.blogs union all select body from public.blog_drafts) bodies;
```

## 14. Risks and open questions

- Technical (CTO): D1. Uploads still in flight from another device after a draft delete can leave orphan files in `{uid}/{key}/`. They are removed by account deletion. A sweep is Later, as for Quests. Word count counts standalone markers (`-`, `1.`), which inflates read time and the 80-word index rule slightly. We accept this rather than change `publish_blog`.
- Product (founder, not blocking): keep the spoiler (D8)? The PRD's C1 ("Could") is now superseded by OQ-26.

## 15. Later

Delete draft from inside the composer. `_` italics and backslash escapes. Nested lists. Word count without markers (needs a migration). A `has_formatting` property on `blog_published`. An orphan-file sweep. Images, tables and emoji (out of scope).
