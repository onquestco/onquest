# Analytics taxonomy (export)

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
