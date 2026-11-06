# 0001: No in-place updates (archive and create new)

| | |
|---|---|
| Status | Accepted, not yet implemented. The current schema still updates rows in place (see "Current gaps") |
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

## Open questions (CTO to settle in the first spec)

- **Where archived rows live:** a separate archive table per data table (live tables hold only current rows, one per key; queries, unique constraints and RLS stay simple) or flags on the same table (`archived_at`, filtered everywhere, and the one-row-per-key rule needs a partial unique index). Recommended: separate archive tables.
- **How big a "document" is:** archive each table separately, or treat a trip (its content, places and photo metadata) as one document saved as a whole. Archiving many child rows on every reorder or caption edit is expensive; one trip document is closer to the document-store model.
- **Drafts:** archive a row on every autosave in the editor, or keep one working draft and archive only on publish and on explicit saves. Archiving every autosave can create dozens of archive rows per trip.
- **Retention:** how long archived drafts are kept (archived published rows kept until the user deletes the trip).

## Current gaps (to fix in the migration spec)

- RLS policies are `for all` (include update) on profiles, trips, photos and places: `supabase/migrations/20261031000002_rls.sql`.
- Grants include `update`: `supabase/migrations/20261031000006_table_grants.sql`.
- `trips_touch_updated_at` trigger updates rows in place: `supabase/migrations/20261031000001_tables.sql`.
- Tables use `id` and have no `saved_at`/`saved_by`/reason: rename `id` to `key`, add those columns, and rename references to keys (`photos.trip_key`, `places.trip_key`, `trips.cover_photo_key`). Archive tables don't exist yet.
- `features/account/actions.ts` saves the profile with `.upsert()`.
- `unique (owner_id, slug)` and `get_trip` assume one row per trip.

There are no real users yet, so this is the cheapest moment to change the schema.
