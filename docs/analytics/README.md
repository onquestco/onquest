# Analytics taxonomy (export)

> **v2 (26 Nov 2026):** `v2/{events,common,codes,metrics}.csv` are the export of the Google Sheet "OnQuest Taxonomy v2 (from code)" (https://docs.google.com/spreadsheets/d/1WMLkO5IG95Iv8VfuPKbTq8z1hlZmlLBDK-GcgK_iZLQ/edit), approved by the CTO. They become the source for `lib/analytics/taxonomy.ts` in AN-01 (`docs/specs/analytics-v2.md`), which also moves the v1 files below to `v1/`. Until AN-01 merges, the code still reads the v1 files.

Exported on 10 Nov 2026 from the OnQuest Taxonomy Google Sheet, which stays the source of truth:
https://docs.google.com/spreadsheets/d/12Ers_nihMPy1hgzmNmvvDkXsFZA6RiNsKN9oTQdtHks/edit

| File | Sheet tab |
| --- | --- |
| `client-events.csv` | Client events: name, user_id, type, ts, property, data type, allowed values, description, required, … |
| `server-events.csv` | Server events (the source of truth for anything counted) |
| `common-properties.csv` | Properties sent on every event (`event_id`, `session_id`, `anon_id`, …) |
| `test-cases.csv` | Prototype test steps and the events each one fires |
| `change-log.csv` | Prototype and taxonomy changes |

An event's first row carries its name and type; following rows with an empty name are more properties of the same event. When the sheet changes, export it again in the same PR as the code that uses the change. No user text, emails, photo links or exact locations in any property.
