# Blog editor: formatting toolbar and deleting drafts

Source: QuestLog tickets OQ-26 and OQ-25, prioritised by the CTO on 25 Nov 2026. Requirements treated as approved (CTO brief, 25 Nov 2026). This is the ticket text as given to the Tech Lead; it extends `docs/prds/blogs.md` (C1, "use bold, a heading and a bullet list") and replaces that PRD's "plain text with paragraphs" body.

## OQ-26: blog editor formatting toolbar

- A toolbar above the blog body on /blogs/new and the edit screen. In priority order: Bold (Ctrl/Cmd+B), Italic (Ctrl/Cmd+I), Strikethrough (~~ ~~), inline code, headings H1–H3 (or a dropdown), bulleted and numbered lists, blockquote, link (Ctrl/Cmd+K; prompts for a URL and validates it), optional spoiler (Reddit-style), undo/redo.
- With a selection, a button wraps it; with no selection, it inserts the markers and puts the cursor between them. Buttons toggle, and show an active state when the cursor is inside formatted text. Tooltips list the shortcut.
- Lists continue on Enter; Enter on an empty item exits the list. Pasting rich text pastes plain text.
- Markdown-style syntax is stored in the body and renders the same in Preview and on the published page.
- Acceptance:
  - Every option works and renders the same in Preview and on the published page.
  - Formatting survives save, reload and publish.
  - On mobile the toolbar scrolls or wraps, with tap targets of at least 40px.
  - Only a safe subset is rendered: no raw HTML, scripts or styles. Follow the CLAUDE.md rules: no dangerouslySetInnerHTML with user text. Prefer rendering parsed markdown to React elements; links get rel=nofollow ugc noopener and only allow http(s) URLs.
  - Existing plain-text blogs display unchanged, and their stored body shape doesn't change (backward compatibility rules).
- Out of scope: images in the body, tables, emoji.
- Check the body length limit and whether markdown characters count toward it.

## OQ-25: delete option for draft blogs

Writers can delete a blog that is in 'draft' status.

- Decide how this fits decision 0001 (no in-place updates; the only real deletes are trip/account deletion). Draft deletion of a never-published blog is probably the same class as trip deletion: it removes the live row, its archived rows and its photo files.
- Say exactly what happens to photos, cache tags and analytics (track a `blog_deleted` event), and what the confirm-dialog copy is.
- Published blogs keep whatever exists today.
- If it needs a migration (a save/delete function or RLS), say so clearly, because production migrations need the CTO's explicit go.
