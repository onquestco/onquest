# 0001: No in-place updates (archive and create new)

| | |
|---|---|
| Status | Accepted and implemented (spec A, migrations 8 and 9; blogs from migration 16). Amendment 1 (retention) added 23 Nov 2026 |
| Decided by | CTO, 2026-11-06 |
| Applies to | Every table that holds user or product data (profiles, trips, photos, places, and anything added later) |

## Decision

We never update a row in place. Every record has one permanent key; every change moves the current row to the archive and inserts a new row under the same key. A row, once written, never changes, and every lookup is by key.

## Rules

1. **One key, nothing else.** Each record has a `key` (uuid, assigned once at creation, never changes; for profiles it is the auth user id). The live table holds exactly one row per key; older rows live only in the archive. **All lookups are by key**: URLs (resolved from handle and slug to the trip key), references between records (`photos.trip_key`, `places.trip_key`, `trips.cover_photo_key`), cache tags, analytics and `TripData`. There is no second id and no version number. Each row also has `saved_at` (set by the save function), which orders the history and is the conflict check.
2. **Saving = archive + insert, atomically.** One Postgres function per save does both in a single transaction: the current row for the key moves to the archive and the new row is inserted under the same key with a new `saved_at`. Never two separate client calls.
3. **No `UPDATE` on data tables, enforced by the database.** No update grant, no update RLS policy, and no `updated_at`-style triggers. App code never calls `.update()` or `.upsert()` on these tables. Inserts and archive-moves happen only inside the save functions.
4. **Optimistic concurrency.** A save passes the `saved_at` of the row it was based on. If the live row for that key has a different `saved_at` (another tab, another device, a stale draft saved in between), the save fails with a conflict error and the user reloads. Nothing is silently overwritten.
5. **Archived rows never change.** They are readable only by their owner (and by admin tasks), never returned by public functions, and never listed on profiles, maps or the sitemap.
6. **Every row records** `saved_at`, `saved_by` and why it was saved (`create`, `save`, `publish`, `unpublish`, `visibility`, `delete`). Archive rows add `archived_at`. A record's history is its archive rows for that key, ordered by `saved_at`.
7. **Deleting is archiving with no successor**, with one exception: a user's request to delete a trip or their account (and any legal deletion request) **hard-deletes the live row, every archived row and the files**, as promised in the PRD and `docs/03-security-visibility-seo.md` (B.4, DPDP). Archiving must never become a way to keep data a user asked us to delete.
8. **Storage files are already immutable.** A replaced photo gets a new photo id and path (PRD §9.1); files are never overwritten.
9. **Archived rows keep their old shape.** Reading an archived row uses the same compatibility rules as current data: stored shapes only grow, with defaults applied on read.

## Why

- A full history of every change, so nothing a user wrote is lost by a bad save or a bug.
- Safe concurrent edits: two tabs or devices can't overwrite each other.
- Simple rollback and debugging: we can see exactly what changed and restore an earlier row.
- Fits how we already treat photos (immutable files, new photo id per replacement).
- One key per record keeps lookups simple: nothing has to be re-pointed when a record changes, and shared links never break. No version counter to maintain: the timestamp already orders history and catches conflicts.

## Open questions (settled)

- **Where archived rows live:** separate archive tables, one per data table (spec A).
- **How big a "document" is:** a Quest is one document (content, photos and places on the row), as is a blog (spec A, blogs spec).
- **Drafts:** settled by spec A. Each Quest and blog has one working draft row; every autosave archives the draft row it replaces, and readers only see changes on Publish/Post. Archive growth is handled by retention (Amendment 1).
- **Retention:** settled by Amendment 1 below.

## Amendment 1: retention (CTO, 23 Nov 2026)

- Archived rows are kept for a fixed time, then deleted by `run_retention_cleanup` (weekly, Sunday 03:00 UTC).
- The ages: archived Quests, Quest drafts, profiles and blogs 180 days; archived blog drafts 30 days (autosave while typing makes about ten times more rows, blogs spec D5); archived likes, comments and follows 90 days; archived notification reads 180 days; notifications 365 days; archived feature access 180 days.
- URL tombstones (`removed_trip_urls`, `removed_blog_urls`) and handle claims are kept forever, so links never get reused.
- User deletes stay immediate (rule 7): a trip, blog or account deletion removes the live rows, every archived row and the files at once, whatever the ages above.

## Current gaps

Fixed by spec A (migrations 8 and 9): keys and save metadata on every table, archive tables, save functions with the `saved_at` conflict check, update grants revoked, the `updated_at` trigger dropped, and the `.upsert()` profile save replaced.

One leftover: the old `for all` RLS policies on the legacy `photos` and `places` tables (`supabase/migrations/20261031000002_rls.sql`) were never dropped. They grant nothing, because those tables' insert, update and delete grants are revoked (migration 9) and nothing writes to them any more. Drop them in a later contract migration.

There are no real users yet, so this is the cheapest moment to change the schema.
