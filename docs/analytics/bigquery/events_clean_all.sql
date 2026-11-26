-- events_clean_all: events_people_all without user_info (no email, username or city), both
-- environments. For Preview checks: add WHERE env = 'preview'. docs/specs/analytics-v2.md §5.3.
CREATE OR REPLACE VIEW `onquest_analytics.events_clean_all`
OPTIONS (
  description = 'v2 events without user_info, all environments (analytics-v2 spec 5.3). Add WHERE env = preview for Preview checks.'
)
AS
SELECT * EXCEPT (user_info)
FROM `onquest_analytics.events_people_all`;
