# Analytics taxonomy v2

Source: QuestLog OQ-12 / OQ-22, and the Google Sheet "OnQuest Taxonomy v2 (from code)" (id `1WMLkO5IG95Iv8VfuPKbTq8z1hlZmlLBDK-GcgK_iZLQ`), exported to `docs/analytics/v2/{events,common,codes,metrics}.csv`. Taxonomy approved by the CTO; build requested by the CTO on 26 Nov 2026. This is the brief as given to the Tech Lead; the CSVs are the requirements.

## Scope

72 events: 1 Live, 14 Live – rename, 57 To build. Current pipeline: `lib/analytics/*` → PostHog (key set) → hourly batch export to BigQuery `onquest_analytics.events`.

## CTO decisions (26 Nov 2026)

- Every event carries a `user_info` JSON with geoip (country, region and city; never the raw IP), username, and a plain-text `email_id`. It's null when signed out.
- The spec must:
  - update CLAUDE.md's "don't log emails" rule to allow this one case;
  - add a decision record in docs/decisions/;
  - flag a privacy-policy update for the founder;
  - cover account deletion removing that user's analytics: PostHog person deletion via their API, and a BigQuery delete job or documented manual step.

## Order (the sheet's Summary gaps)

1. Foundations: call identify() and setScreen() everywhere; common properties per common.csv (anon_id, session_id, platform/os/browser, screen codes, is_internal_flg for @swativb, @alok18 and @quest, is_bot_flg); user_info; and the generated taxonomy.ts from the v2 CSVs, replacing the old one (keep the regeneration script). Also rename the 14 live events, keeping the blog_* events working, and note the rename in the change log.
2. Quest view, page turns and view-ended events.
3. Quest create flow.
4. Sign up and sign in, username, onboarding.
5. Share and Instagram export, likes, comments, follows, notifications.
6. Profile, settings, search/explore, account and everything else.

## Rules

- No user-written text in properties (lengths and counts only), with email_id as the one documented exception.
- Server events are the source of truth for counts.
- Tests per CLAUDE.md, including a taxonomy check test.
- Keep BigQuery queries in the sheet's Metrics tab valid.
