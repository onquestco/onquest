-- G1 Part A: fixture check (docs/specs/analytics-v2.md §8.1, review round 1 should-fix 5).
-- Runs the real events_people_all / events_clean_all SQL over literal rows in a scratch dataset
-- and checks the result: v1 renames and values, v1 identity, the env fallback, the properties
-- allowlist, the shared-device guard, account_deleted, the anon_id fill, person_id and the derived
-- properties. Touches only the scratch dataset onquest_analytics_g1_check, and drops it on
-- success. On failure it lists the failing checks and the ASSERT stops the script; drop the
-- scratch dataset by hand afterwards.
--
-- Devices: D1 is shared by user-a (deleted) and user-b; D2 is user-c's; D3 a signed-out
-- Preview visitor; D4 user-p's, on Preview.

CREATE SCHEMA IF NOT EXISTS `onquest_analytics_g1_check`
OPTIONS (description = 'Scratch for the analytics v2 G1 fixture check; safe to drop');

CREATE OR REPLACE TABLE `onquest_analytics_g1_check.events` (
  uuid STRING,
  event STRING,
  distinct_id STRING,
  `timestamp` TIMESTAMP,
  properties JSON,
  site_url STRING,
  ip STRING
);

INSERT INTO `onquest_analytics_g1_check.events` (uuid, event, distinct_id, `timestamp`, properties, site_url)
VALUES
  ('u01', 'blog_viewed', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-20 10:00:00+00', JSON '{"event_id":"e01","anon_id":"anon_22222222-2222-4222-8222-222222222222","platform":"web_mobile","app_version":"abc1234","blog_id":"b1","view_id":"v1","signed_in":false,"referrer":"whatsapp","has_quest":true,"$geoip_country_code":"IN","$geoip_city_name":"Panaji","$geoip_postal_code":"403001","$geoip_latitude":15.49,"$geoip_longitude":73.82,"$ip":"203.0.113.7","$set":{"$geoip_city_name":"Panaji"}}', 'https://us.posthog.com'),
  ('u02', 'blog_viewed', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-20 10:00:09+00', JSON '{"event_id":"e01","anon_id":"anon_22222222-2222-4222-8222-222222222222","blog_id":"b1","view_id":"v1"}', 'https://us.posthog.com'),
  ('u03', 'blog_published', 'user-c', TIMESTAMP '2026-11-20 11:00:00+00', JSON '{"event_id":"e03","type":"server","server_ts":"2026-11-20T11:00:00Z","screen":"server","blog_id":"b1","visibility":"unlisted","photos":3,"chars_bucket":"1-500","has_quest":false,"has_place":true,"minutes_since_start":4.5,"$geoip_disable":true,"$lib":"onquest-server"}', 'https://us.posthog.com'),
  ('u04', 'quest_viewed', 'user-c', TIMESTAMP '2026-11-27 10:00:05+00', JSON '{"event_id":"e04","env":"production","type":"view","user_id":"user-c","anon_id":"anon_22222222-2222-4222-8222-222222222222","session_id":"s4","platform":1,"client_ts":"2026-11-27T10:00:00Z","quest_id":"q1","owner_user_id":"user-a","is_owner_flg":false,"$current_url":"https://onquest.in/@[handle]/[slug]","$geoip_city_name":"Panaji","user_info":{"geoip":{"country":"IN","region":"GA","city":"Panaji"},"username":"cee","email_id":"c@example.com"}}', 'https://us.posthog.com'),
  ('u05', 'create_option_tapped', 'anon_33333333-3333-4333-8333-333333333333', TIMESTAMP '2026-11-25 12:00:00+00', JSON '{"event_id":"e05","anon_id":"anon_33333333-3333-4333-8333-333333333333","platform":"web_desktop","option":"blog","available":false,"$current_url":"https://onquest-git-feature-on-quest.vercel.app/create"}', 'https://us.posthog.com'),
  ('u06', '$pageview', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-20 09:59:00+00', JSON '{"event_id":"e06","anon_id":"anon_22222222-2222-4222-8222-222222222222","$current_url":"https://onquest.in/home","$pathname":"/home","$screen_width":390}', 'https://us.posthog.com'),
  ('u07', '$identify', 'user-c', TIMESTAMP '2026-11-20 09:59:30+00', JSON '{"event_id":"e07","$anon_distinct_id":"anon_22222222-2222-4222-8222-222222222222"}', 'https://us.posthog.com'),
  ('u08', 'quest_viewed', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-27 11:00:00+00', JSON '{"event_id":"e08","env":"production","type":"view","anon_id":"anon_22222222-2222-4222-8222-222222222222","is_bot_flg":true,"quest_id":"q1"}', 'https://us.posthog.com'),
  ('u09', 'tab_click', 'user-a', TIMESTAMP '2026-11-26 09:00:00+00', JSON '{"event_id":"e09","env":"production","type":"click","user_id":"user-a","anon_id":"anon_11111111-1111-4111-8111-111111111111","tab":0}', 'https://us.posthog.com'),
  ('u10', 'legal_page_viewed', 'anon_11111111-1111-4111-8111-111111111111', TIMESTAMP '2026-11-20 08:00:00+00', JSON '{"event_id":"e10","anon_id":"anon_11111111-1111-4111-8111-111111111111","page":"privacy","source":"footer"}', 'https://us.posthog.com'),
  ('u11', 'home_viewed', 'user-b', TIMESTAMP '2026-11-26 09:30:00+00', JSON '{"event_id":"e11","env":"production","type":"view","user_id":"user-b","anon_id":"anon_11111111-1111-4111-8111-111111111111","signed_in_flg":true}', 'https://us.posthog.com'),
  ('u12', 'account_deleted', 'deleted_0f8c06e0-ff8e-4996-ada5-c17de627ae88', TIMESTAMP '2026-11-26 10:00:00+00', JSON '{"event_id":"e12","env":"production","type":"server","user_id":"user-a","anon_id":null,"session_id":null,"user_info":null,"quest_count":2,"blog_count":0,"follower_count":1,"days_since_signup":5}', 'https://us.posthog.com'),
  ('u13', 'blog_managed', 'user-c', TIMESTAMP '2026-11-21 10:00:00+00', JSON '{"event_id":"e13","type":"server","blog_id":"b1","action":"visibility","value":"private"}', 'https://us.posthog.com'),
  ('u14', 'blog_managed', 'user-c', TIMESTAMP '2026-11-21 10:01:00+00', JSON '{"event_id":"e14","type":"server","blog_id":"b1","action":"comments","value":"off"}', 'https://us.posthog.com'),
  ('u15', 'blog_managed', 'user-c', TIMESTAMP '2026-11-21 10:02:00+00', JSON '{"event_id":"e15","type":"server","blog_id":"b1","action":"delete","value":"none"}', 'https://us.posthog.com'),
  ('u16', 'blog_managed', 'user-c', TIMESTAMP '2026-11-21 10:03:00+00', JSON '{"event_id":"e16","type":"server","blog_id":"b1","action":"edit","value":"none"}', 'https://us.posthog.com'),
  ('u17', 'blog_deleted', 'user-c', TIMESTAMP '2026-11-21 10:04:00+00', JSON '{"event_id":"e17","type":"server","blog_id":"b2","status":"draft","photos":2,"chars_bucket":"0","has_quest":false}', 'https://us.posthog.com'),
  ('u18', 'blog_liked', 'user-c', TIMESTAMP '2026-11-21 10:05:00+00', JSON '{"event_id":"e18","type":"server","blog_id":"b1","unlike":true,"source":"after_sign_in"}', 'https://us.posthog.com'),
  ('u19', 'blog_comment_posted', 'user-c', TIMESTAMP '2026-11-21 10:06:00+00', JSON '{"event_id":"e19","type":"server","blog_id":"b1","length":42}', 'https://us.posthog.com'),
  ('u20', 'legal_page_viewed', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-21 10:07:00+00', JSON '{"event_id":"e20","anon_id":"anon_22222222-2222-4222-8222-222222222222","page":"terms","source":"settings"}', 'https://us.posthog.com'),
  ('u21', 'blog_create_started', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-21 10:08:00+00', JSON '{"event_id":"e21","anon_id":"anon_22222222-2222-4222-8222-222222222222","blog_id":"b2","source":"write_your_own"}', 'https://us.posthog.com'),
  ('u22', 'blog_quest_linked', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-21 10:09:00+00', JSON '{"event_id":"e22","anon_id":"anon_22222222-2222-4222-8222-222222222222","blog_id":"b2","action":"remove"}', 'https://us.posthog.com'),
  ('u23', 'blog_previewed', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-21 10:10:00+00', JSON '{"event_id":"e23","anon_id":"anon_22222222-2222-4222-8222-222222222222","blog_id":"b2"}', 'https://us.posthog.com'),
  ('u24', 'blog_draft_saved', 'user-c', TIMESTAMP '2026-11-21 10:11:00+00', JSON '{"event_id":"e24","type":"server","blog_id":"b2","chars_bucket":"1-500","photos":4}', 'https://us.posthog.com'),
  ('u25', 'blog_quest_opened', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-21 10:12:00+00', JSON '{"event_id":"e25","anon_id":"anon_22222222-2222-4222-8222-222222222222","blog_id":"b1","view_id":"v1"}', 'https://us.posthog.com'),
  ('u26', 'blog_read_end', 'anon_22222222-2222-4222-8222-222222222222', TIMESTAMP '2026-11-21 10:13:00+00', JSON '{"event_id":"e26","anon_id":"anon_22222222-2222-4222-8222-222222222222","blog_id":"b1","view_id":"v1","seconds":30}', 'https://us.posthog.com'),
  ('u27', 'sign_in_click', 'anon_44444444-4444-4444-8444-444444444444', TIMESTAMP '2026-11-26 08:00:00+00', JSON '{"event_id":"e27","env":"preview","type":"click","anon_id":"anon_44444444-4444-4444-8444-444444444444","method":"google","source":0}', 'https://us.posthog.com'),
  ('u28', 'user_signed_up', 'user-p', TIMESTAMP '2026-11-26 08:05:00+00', JSON '{"event_id":"e28","env":"preview","type":"server","user_id":"user-p","anon_id":null,"method":"google","source":0}', 'https://us.posthog.com'),
  ('u29', 'home_viewed', 'user-p', TIMESTAMP '2026-11-26 08:06:00+00', JSON '{"event_id":"e29","env":"preview","type":"view","user_id":"user-p","anon_id":"anon_44444444-4444-4444-8444-444444444444","signed_in_flg":true}', 'https://us.posthog.com'),
  ('u30', 'user_signed_in', 'user-p', TIMESTAMP '2026-11-28 08:05:00+00', JSON '{"event_id":"e30","env":"preview","type":"server","user_id":"user-p","anon_id":null,"method":"google","source":0}', 'https://us.posthog.com'),
  ('u31', 'notification_sent', 'user-c', TIMESTAMP '2026-11-27 12:00:00+00', JSON '{"event_id":"e31","env":"production","type":"server","user_id":"user-c","anon_id":null,"kind":0,"channel":0,"actor_user_id":"user-b","content_type":0,"content_id":"q1"}', 'https://us.posthog.com'),
  ('u32', 'blog_read_end', 'anon_33333333-3333-4333-8333-333333333333', TIMESTAMP '2026-11-25 12:05:00+00', JSON '{"event_id":"e32","anon_id":"anon_33333333-3333-4333-8333-333333333333","blog_id":"b1","view_id":"v9","seconds":8}', 'https://onquest-git-feature-on-quest.vercel.app');

CREATE OR REPLACE TABLE `onquest_analytics_g1_check.deleted_users` AS
SELECT 'user-a' AS user_id, TIMESTAMP '2026-11-26 10:00:00+00' AS deleted_at;

CREATE OR REPLACE TABLE `onquest_analytics_g1_check.deleted_devices` AS
SELECT 'anon_11111111-1111-4111-8111-111111111111' AS anon_id, 'user-a' AS user_id, TIMESTAMP '2026-11-26 10:00:00+00' AS deleted_at;

-- @scratch-views

CREATE TEMP TABLE fixture_checks AS
SELECT * FROM UNNEST([
  STRUCT('27 rows survive: duplicate, $identify, bot, deleted user and device dropped' AS check_name, IFNULL((SELECT COUNT(*) FROM `onquest_analytics_g1_check.events_people_all`) = 27, FALSE) AS ok),
  STRUCT('e07 to e10 dropped' AS check_name, IFNULL((SELECT COUNT(*) FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id IN ('e07', 'e08', 'e09', 'e10')) = 0, FALSE) AS ok),
  STRUCT('e01 kept once (duplicate event_id)' AS check_name, IFNULL((SELECT COUNT(*) FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e01') = 1, FALSE) AS ok),
  STRUCT('e01 v1 signed-out blog_viewed mapped' AS check_name, IFNULL((SELECT name = 'blog_viewed' AND type = 'view' AND env = 'production' AND user_id IS NULL AND anon_id = 'anon_22222222-2222-4222-8222-222222222222' AND platform = 0 AND country = 'IN' AND client_ts = ts AND JSON_VALUE(properties, '$.signed_in_flg') = 'false' AND JSON_VALUE(properties, '$.referrer') = '1' AND JSON_VALUE(properties, '$.has_quest_flg') = 'true' AND JSON_VALUE(properties, '$.signed_in') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e01'), FALSE) AS ok),
  STRUCT('e01 person_id is the user later seen on the device' AS check_name, IFNULL((SELECT person_id = 'user-c' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e01'), FALSE) AS ok),
  STRUCT('no $ key but $current_url and $pathname in events_clean_all' AS check_name, IFNULL((SELECT COUNT(*) FROM `onquest_analytics_g1_check.events_clean_all`, UNNEST(JSON_KEYS(properties, 1)) AS key WHERE STARTS_WITH(key, '$') AND key NOT IN ('$current_url', '$pathname')) = 0, FALSE) AS ok),
  STRUCT('no city, postcode, IP, lat/long or email anywhere in events_clean_all' AS check_name, IFNULL((SELECT COUNTIF(REGEXP_CONTAINS(TO_JSON_STRING(clean), r'Panaji|403001|203\.0\.113|15\.49|73\.82|c@example')) FROM `onquest_analytics_g1_check.events_clean_all` AS clean) = 0, FALSE) AS ok),
  STRUCT('events_people_all keeps user_info' AS check_name, IFNULL((SELECT JSON_VALUE(user_info, '$.email_id') = 'c@example.com' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e04'), FALSE) AS ok),
  STRUCT('e04 v2 row: client_ts, platform, $current_url kept, no user_info in properties' AS check_name, IFNULL((SELECT client_ts = TIMESTAMP '2026-11-27 10:00:00+00' AND platform = 1 AND person_id = 'user-c' AND JSON_VALUE(properties, '$."$current_url"') IS NOT NULL AND JSON_QUERY(properties, '$.user_info') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e04'), FALSE) AS ok),
  STRUCT('e03 v1 server blog_published: identity, values, anon_id from a later browser row' AS check_name, IFNULL((SELECT user_id = 'user-c' AND type = 'server' AND env = 'production' AND client_ts IS NULL AND anon_id = 'anon_22222222-2222-4222-8222-222222222222' AND JSON_VALUE(properties, '$.visibility') = '1' AND JSON_VALUE(properties, '$.photo_count') = '3' AND JSON_VALUE(properties, '$.has_quest_flg') = 'false' AND JSON_VALUE(properties, '$.has_place_flg') = 'true' AND JSON_VALUE(properties, '$.photos') IS NULL AND JSON_VALUE(properties, '$.server_ts') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e03'), FALSE) AS ok),
  STRUCT('e05 v1 create_option_tapped on a vercel.app URL is preview' AS check_name, IFNULL((SELECT name = 'create_option_click' AND type = 'click' AND env = 'preview' AND platform = 1 AND JSON_VALUE(properties, '$.option') = '1' AND JSON_VALUE(properties, '$.available_flg') = 'false' AND JSON_VALUE(properties, '$.available') IS NULL AND person_id = 'anon_33333333-3333-4333-8333-333333333333' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e05'), FALSE) AS ok),
  STRUCT('e06 $pageview: view, production, route template kept, other $ keys gone' AS check_name, IFNULL((SELECT type = 'view' AND env = 'production' AND JSON_VALUE(properties, '$."$pathname"') = '/home' AND JSON_VALUE(properties, '$."$screen_width"') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e06'), FALSE) AS ok),
  STRUCT('e11 user-b keeps signed-in rows on the deleted device' AS check_name, IFNULL((SELECT user_id = 'user-b' AND anon_id = 'anon_11111111-1111-4111-8111-111111111111' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e11'), FALSE) AS ok),
  STRUCT('e12 account_deleted kept, no anon_id' AS check_name, IFNULL((SELECT name = 'account_deleted' AND user_id = 'user-a' AND anon_id IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e12'), FALSE) AS ok),
  STRUCT('e13 blog_managed visibility' AS check_name, IFNULL((SELECT name = 'visibility_changed' AND JSON_VALUE(properties, '$.content_type') = '1' AND JSON_VALUE(properties, '$.content_id') = 'b1' AND JSON_VALUE(properties, '$.to_visibility') = '2' AND JSON_VALUE(properties, '$.action') IS NULL AND JSON_VALUE(properties, '$.blog_id') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e13'), FALSE) AS ok),
  STRUCT('e14 blog_managed comments' AS check_name, IFNULL((SELECT name = 'comments_toggled' AND JSON_VALUE(properties, '$.comments_on_flg') = 'false' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e14'), FALSE) AS ok),
  STRUCT('e15 blog_managed delete' AS check_name, IFNULL((SELECT name = 'content_deleted' AND JSON_VALUE(properties, '$.was_published_flg') = 'true' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e15'), FALSE) AS ok),
  STRUCT('e16 blog_managed edit' AS check_name, IFNULL((SELECT name = 'blog_updated' AND JSON_VALUE(properties, '$.blog_id') = 'b1' AND JSON_VALUE(properties, '$.action') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e16'), FALSE) AS ok),
  STRUCT('e17 blog_deleted' AS check_name, IFNULL((SELECT name = 'content_deleted' AND JSON_VALUE(properties, '$.was_published_flg') = 'false' AND JSON_VALUE(properties, '$.photo_count') = '2' AND JSON_VALUE(properties, '$.status') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e17'), FALSE) AS ok),
  STRUCT('e18 blog_liked' AS check_name, IFNULL((SELECT name = 'content_liked' AND JSON_VALUE(properties, '$.content_id') = 'b1' AND JSON_VALUE(properties, '$.unlike_flg') = 'true' AND JSON_VALUE(properties, '$.source') = '3' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e18'), FALSE) AS ok),
  STRUCT('e19 blog_comment_posted' AS check_name, IFNULL((SELECT name = 'comment_posted' AND JSON_VALUE(properties, '$.comment_length') = '42' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e19'), FALSE) AS ok),
  STRUCT('e20 legal_page_viewed values' AS check_name, IFNULL((SELECT name = 'legal_page_viewed' AND JSON_VALUE(properties, '$.page') = '1' AND JSON_VALUE(properties, '$.source') = '1' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e20'), FALSE) AS ok),
  STRUCT('e21 blog_create_started source' AS check_name, IFNULL((SELECT type = 'view' AND JSON_VALUE(properties, '$.click_loc') = '1' AND JSON_VALUE(properties, '$.source') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e21'), FALSE) AS ok),
  STRUCT('e22 blog_quest_linked' AS check_name, IFNULL((SELECT name = 'blog_editor_action' AND JSON_VALUE(properties, '$.action') = '7' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e22'), FALSE) AS ok),
  STRUCT('e23 blog_previewed' AS check_name, IFNULL((SELECT name = 'blog_editor_action' AND JSON_VALUE(properties, '$.action') = '5' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e23'), FALSE) AS ok),
  STRUCT('e24 blog_draft_saved' AS check_name, IFNULL((SELECT JSON_VALUE(properties, '$.photo_count') = '4' AND JSON_VALUE(properties, '$.photos') IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e24'), FALSE) AS ok),
  STRUCT('e25 blog_quest_opened' AS check_name, IFNULL((SELECT name = 'blog_quest_click' AND JSON_VALUE(properties, '$.view_id') = 'v1' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e25'), FALSE) AS ok),
  STRUCT('e26 blog_read_end unchanged' AS check_name, IFNULL((SELECT name = 'blog_read_end' AND type = 'client' AND JSON_VALUE(properties, '$.seconds') = '30' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e26'), FALSE) AS ok),
  STRUCT('e28 preview sign-up: anon_id filled, first_seen_ts derived' AS check_name, IFNULL((SELECT env = 'preview' AND anon_id = 'anon_44444444-4444-4444-8444-444444444444' AND TIMESTAMP(JSON_VALUE(properties, '$.first_seen_ts')) = TIMESTAMP '2026-11-26 08:00:00+00' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e28'), FALSE) AS ok),
  STRUCT('e30 days_since_last_sign_in derived' AS check_name, IFNULL((SELECT JSON_VALUE(properties, '$.days_since_last_sign_in') = '2' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e30'), FALSE) AS ok),
  STRUCT('e31 notification_sent never gets an anon_id' AS check_name, IFNULL((SELECT anon_id IS NULL FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e31'), FALSE) AS ok),
  STRUCT('e32 no env, site_url on vercel.app is preview' AS check_name, IFNULL((SELECT env = 'preview' FROM `onquest_analytics_g1_check.events_people_all` WHERE event_id = 'e32'), FALSE) AS ok),
  STRUCT('events_clean_all has the same rows' AS check_name, IFNULL((SELECT COUNT(*) FROM `onquest_analytics_g1_check.events_clean_all`) = 27, FALSE) AS ok)
]);

-- Expect no rows here.
SELECT check_name AS failing_check FROM fixture_checks WHERE NOT ok;

ASSERT NOT EXISTS (SELECT 1 FROM fixture_checks WHERE NOT ok)
  AS 'G1 fixture check failed: see the failing_check list above. Drop onquest_analytics_g1_check by hand.';

DROP SCHEMA `onquest_analytics_g1_check` CASCADE;
