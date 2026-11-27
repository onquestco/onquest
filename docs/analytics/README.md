> **v2 (26 Nov 2026):** `v2/{events,common,codes,metrics}.csv` are the export of the Google Sheet "OnQuest Taxonomy v2 (from code)" (https://docs.google.com/spreadsheets/d/1WMLkO5IG95Iv8VfuPKbTq8z1hlZmlLBDK-GcgK_iZLQ/edit), approved by the CTO (`docs/specs/analytics-v2.md`).
>
> - `npm run analytics` writes `lib/analytics/taxonomy.ts` from `v2/events.csv` and `v2/common.csv`; the app sends only these names (AN-02). The v1 rules are frozen in `lib/analytics/taxonomyV1.ts` (not generated; only `/ingest` may use it, for old tabs and rollback) and the v1 files below are in `v1/`. Both go 30 days after AN-02 deploys (spec §15).
> - Re-export the sheet into `v2/` and run `npm run analytics` in the same PR; `taxonomy.test.ts` fails if the generated file is stale, and `taxonomyRules.test.ts` fails on a free-text STRING, a `_flg` that isn't BOOL or a code list missing from `codes.csv`.
> - `bigquery/` holds the BigQuery tables and views (spec §5.3): `deleted_users`, `deleted_devices`, `events_people_all` (all the logic, with `user_info`; founders only), `events_clean_all` (without `user_info`), and the production-only `events_clean` (what the Metrics queries read) and `events_people`. `properties` is rebuilt from an allowlist (taxonomy and common keys plus `$current_url` / `$pathname`), so no PostHog location, IP or `$set` data reaches a view.
> - `npm run analytics` also writes `bigquery/g1_fixture_check.sql` (the views run over literal fixture rows in a scratch dataset, with checks) and `bigquery/apply-g1.sql` (the G1 checklist, the fixture check as Part A, the six objects as Part B), from `g1_checklist.sql`, `g1_fixture_check.template.sql` and the six object files. Don't edit the two generated files; `metricsSql.test.ts` fails if they are stale.
> - The v1 → v2 rename map is `lib/analytics/renameMap.ts`, mirrored in `events_people_all.sql` for history.

**v1 (frozen).** Exported on 10 Nov 2026 from the v1 OnQuest Taxonomy Google Sheet, replaced by v2 above:
https://docs.google.com/spreadsheets/d/12Ers_nihMPy1hgzmNmvvDkXsFZA6RiNsKN9oTQdtHks/edit

| File | Sheet tab |
| --- | --- |
| `v1/client-events.csv` | Client events: name, user_id, type, ts, property, data type, allowed values, description, required, … |
| `v1/server-events.csv` | Server events (the source of truth for anything counted) |
| `v1/common-properties.csv` | Properties sent on every event (`event_id`, `session_id`, `anon_id`, …) |
| `v1/test-cases.csv` | Prototype test steps and the events each one fires |
| `change-log.csv` | Prototype and taxonomy changes (v1 and v2; stays here) |

An event's first row carries its name and type; following rows with an empty name are more properties of the same event. When the sheet changes, export it again in the same PR as the code that uses the change. No user text, emails, photo links or exact locations in any property.
