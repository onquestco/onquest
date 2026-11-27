-- events_clean: what the Metrics queries read. Production only, no user_info (no email,
-- username or city). docs/specs/analytics-v2.md §5.3; columns in events_people_all.sql.
CREATE OR REPLACE VIEW `onquest_analytics.events_clean`
OPTIONS (
  description = 'v2 events for Metrics: production only, no user_info (analytics-v2 spec 5.3).'
)
AS
SELECT *
FROM `onquest_analytics.events_clean_all`
WHERE env = 'production';
