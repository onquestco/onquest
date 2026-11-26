-- events_people: founders only. events_clean plus user_info (email, username, city), production
-- only. docs/specs/analytics-v2.md §5.3, decision 0004.
CREATE OR REPLACE VIEW `onquest_analytics.events_people`
OPTIONS (
  description = 'Founders only: production v2 events with user_info (analytics-v2 spec 5.3, decision 0004).'
)
AS
SELECT *
FROM `onquest_analytics.events_people_all`
WHERE env = 'production';
