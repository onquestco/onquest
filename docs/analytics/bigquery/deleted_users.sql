-- deleted_users: the user key of every deleted account, and nothing else about the person.
-- Written by the analytics erasure job (AN-04, docs/specs/analytics-v2.md §5.2) on its first run
-- for a key. events_people_all anti-joins it, so a row that reaches BigQuery after the 30-day
-- re-runs is still never read (except account_deleted, kept so deletions can be counted).
CREATE TABLE IF NOT EXISTS `onquest_analytics.deleted_users` (
  user_id STRING NOT NULL OPTIONS (description = 'User key of a deleted account'),
  deleted_at TIMESTAMP NOT NULL OPTIONS (description = 'When analytics erasure first ran for this key')
)
OPTIONS (description = 'Key-only list of deleted accounts (analytics-v2 spec 5.2). No personal data.');
