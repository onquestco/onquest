-- =============================================================================================
-- Gate G1 (docs/specs/analytics-v2.md §8.1): BigQuery objects for analytics v2, ready to paste.
-- The CTO applies this by hand, after the dry-run checklist below, before AN-01 merges.
--
-- This file is the six files in this folder, in the order they depend on each other:
--   deleted_users.sql, deleted_devices.sql   two key-only tables (written by erasure, AN-04)
--   events_people_all.sql                    all the logic; founders only (has user_info)
--   events_clean_all.sql                     the same without user_info, both environments
--   events_clean.sql                         what the Metrics queries read (production only)
--   events_people.sql                        founders only, production only
-- metricsSql.test.ts fails if this file and the six drift apart. Nothing here changes or
-- deletes a row of `onquest_analytics.events`.
--
-- DRY-RUN CHECKLIST (bq CLI, signed in as a founder, default project = the analytics project)
--
-- [ ] 1. Export schema. Run:
--          bq show --schema --format=prettyjson onquest_analytics.events
--        Confirm the columns uuid, event, distinct_id, timestamp, properties exist.
--        Report the type of `properties` on the PR (STRING or JSON). If it is JSON, say so
--        and stop: the builder changes the line marked "G1:" to `properties AS props` (in
--        events_people_all.sql and here) and pushes, then start again from step 1.
--
-- [ ] 2. Raw IP in history. Run:
--          bq query --use_legacy_sql=false \
--            'SELECT COUNTIF(ip IS NOT NULL AND ip != "") AS rows_with_ip FROM onquest_analytics.events'
--        Expect 0. If not, null it once (DML on the export table; wait if it reports a
--        streaming buffer):
--          bq query --use_legacy_sql=false \
--            'UPDATE onquest_analytics.events SET ip = NULL WHERE ip IS NOT NULL'
--        Report the count (before and after) on the PR. The views never select `ip`.
--
-- [ ] 3. Dry-run, then apply, one statement at a time and in this order (each view reads the
--        one before it, so a view's dry run only passes once the previous one exists):
--          cd docs/analytics/bigquery
--          for f in deleted_users deleted_devices events_people_all events_clean_all \
--                   events_clean events_people; do
--            bq query --use_legacy_sql=false --dry_run < "$f.sql" && \
--            bq query --use_legacy_sql=false < "$f.sql" || break
--          done
--        Or paste this whole file into the BigQuery console and Run it (it is one script).
--
-- [ ] 4. Dry-run every Metrics query (docs/analytics/v2/metrics.csv, column "BigQuery SQL",
--        18 queries) with `bq query --use_legacy_sql=false --dry_run '<query>'`. All must pass.
--
-- [ ] 5. Sanity checks on history (run for real; small):
--        a. No v1-only name is left:
--             SELECT name, COUNT(*) FROM onquest_analytics.events_clean_all
--             WHERE name IN ('create_option_tapped','blog_managed','blog_deleted','blog_liked',
--               'blog_comment_posted','blog_quest_linked','blog_previewed','blog_quest_opened')
--             GROUP BY name
--           Expect no rows ('blog_managed' only if an unknown action was ever sent).
--        b. "Blog adoption" and "Blog read-through" (metrics.csv) return non-zero numbers over
--           history (AC8).
--        c. Nothing but $-events, bots and duplicates is lost:
--             SELECT (SELECT COUNT(DISTINCT COALESCE(JSON_VALUE(SAFE.PARSE_JSON(properties),
--                       '$.event_id'), uuid)) FROM onquest_analytics.events
--                     WHERE NOT STARTS_WITH(event, '$') OR event = '$pageview') AS raw_events,
--                    (SELECT COUNT(*) FROM onquest_analytics.events_clean_all) AS view_events
--           Expect view_events = raw_events (no bots or deletions exist yet).
--        d. No email in the clean views:
--             SELECT COUNT(*) FROM onquest_analytics.events_clean_all
--             WHERE REGEXP_CONTAINS(TO_JSON_STRING(properties), r'[^\s@"]+@[^\s@"]+\.[a-z]')
--           Expect 0.
--
-- [ ] 6. Access. events_people, events_people_all and the raw `events` table hold emails once
--        user_info is on: keep them founders only. If anyone else needs events_clean, give it
--        to them as an authorized view in another dataset, not as access to this dataset.
--
-- [ ] 7. Comment "G1 passed" on the AN-01 PR with the results of 1, 2, 4 and 5.
--
-- Later, not blocking the merge (spec §8.1): once Preview has data with the oq_actx cookie
-- off (after AN-07 is on Preview), run on events_clean_all with WHERE env = 'preview':
--   - the Metrics "Viewer → creator" query (FROM events_clean_all, plus AND env = 'preview' in
--     both CTEs), and
--   - SELECT COUNTIF(JSON_VALUE(properties, '$.first_seen_ts') IS NOT NULL) AS with_first_seen,
--            COUNT(*) AS sign_ups
--     FROM onquest_analytics.events_clean_all WHERE env = 'preview' AND name = 'user_signed_up'
-- and confirm both are non-zero.
-- =============================================================================================

-- ==== deleted_users.sql ====
-- deleted_users: the user key of every deleted account, and nothing else about the person.
-- Written by the analytics erasure job (AN-04, docs/specs/analytics-v2.md §5.2) on its first run
-- for a key. events_people_all anti-joins it, so a row that reaches BigQuery after the 30-day
-- re-runs is still never read (except account_deleted, kept so deletions can be counted).
CREATE TABLE IF NOT EXISTS `onquest_analytics.deleted_users` (
  user_id STRING NOT NULL OPTIONS (description = 'User key of a deleted account'),
  deleted_at TIMESTAMP NOT NULL OPTIONS (description = 'When analytics erasure first ran for this key')
)
OPTIONS (description = 'Key-only list of deleted accounts (analytics-v2 spec 5.2). No personal data.');

-- ==== deleted_devices.sql ====
-- deleted_devices: the anon_ids (random device ids) seen with a deleted account's key. The erasure
-- job (AN-04) stores them on its first run, so the daily re-runs can still delete signed-out rows
-- from those devices that reach BigQuery late, after the rows linking them to the key are gone.
-- events_people_all anti-joins it with the shared-device guard: only signed-out rows or the
-- deleted person's own rows are hidden, never another person's signed-in rows.
CREATE TABLE IF NOT EXISTS `onquest_analytics.deleted_devices` (
  anon_id STRING NOT NULL OPTIONS (description = 'anon_<uuid> device id seen with the deleted key'),
  user_id STRING NOT NULL OPTIONS (description = 'User key of the deleted account'),
  deleted_at TIMESTAMP NOT NULL OPTIONS (description = 'When analytics erasure first stored this device')
)
OPTIONS (description = 'Device ids of deleted accounts (analytics-v2 spec 5.2). Random ids and keys only.');

-- ==== events_people_all.sql ====
-- events_people_all: every PostHog event in v2 terms, both environments, WITH user_info (email,
-- username, city). Founders only (decision 0004). Everyone else reads events_clean, which is this
-- view without user_info and filtered to env = 'production'. docs/specs/analytics-v2.md §5.3.
--
-- Reads the PostHog batch export `onquest_analytics.events` and assumes its `properties` column
-- is STRING (PostHog's default). G1: if the export uses the JSON type, change the one marked line
-- in `raw` to `properties AS props`.
--
-- What it does, in order:
--   raw        $-events dropped except $pageview. The export's `ip` column is never selected.
--   deduped    one row per event_id; is_bot_flg = true dropped.
--   renamed    v1 names → v2 names (the table in spec §5.3, same as lib/analytics/renameMap.ts).
--   rewritten  v1 property names and string values → v2. Each branch leaves a v2 row unchanged,
--              so rows sent after the cut-over with the same name pass through.
--   common     the common columns. v1 rows (no env) count as production; their user_id is a
--              distinct_id that isn't anon_…, their anon_id the anon_… distinct_id.
--   kept       deleted people's rows left out (deleted_users, deleted_devices with the
--              shared-device guard), except account_deleted.
--   filled     server events' null anon_id filled from the same user's browser rows while the
--              oq_actx cookie is off: the latest at or before the event, else the earliest after.
--   (final)    person_id for DAU; first_seen_ts and days_since_last_sign_in derived (spec D7).
--
-- Time: ts is PostHog's `timestamp`. For v1 browser rows, and v2 browser rows sent before AN-03
-- (whose client still sent `timestamp`), that is the DEVICE clock, also copied to client_ts.
-- From AN-03 on, browser rows get the server time and client_ts is the device time.
CREATE OR REPLACE VIEW `onquest_analytics.events_people_all`
OPTIONS (
  description = 'Founders only: v2 events with user_info, all environments (analytics-v2 spec 5.3). ts is device time for browser rows sent without env and before AN-03 (cut-over: AN-02 deploy). Others read events_clean.'
)
AS
WITH
raw AS (
  SELECT
    uuid,
    event,
    distinct_id,
    `timestamp` AS exported_ts,
    SAFE.PARSE_JSON(properties) AS props -- G1: `properties AS props` if the column is JSON
  FROM `onquest_analytics.events`
  WHERE NOT STARTS_WITH(event, '$') OR event = '$pageview'
),

deduped AS (
  SELECT
    COALESCE(JSON_VALUE(props, '$.event_id'), uuid) AS event_id,
    event AS raw_name,
    distinct_id,
    exported_ts,
    props,
    JSON_VALUE(props, '$.env') AS raw_env
  FROM raw
  WHERE COALESCE(JSON_VALUE(props, '$.is_bot_flg'), 'false') != 'true'
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY COALESCE(JSON_VALUE(props, '$.event_id'), uuid) ORDER BY exported_ts, uuid
  ) = 1
),

renamed AS (
  SELECT
    *,
    CASE raw_name
      WHEN 'create_option_tapped' THEN 'create_option_click'
      WHEN 'blog_managed' THEN
        CASE JSON_VALUE(props, '$.action')
          WHEN 'visibility' THEN 'visibility_changed'
          WHEN 'comments' THEN 'comments_toggled'
          WHEN 'delete' THEN 'content_deleted'
          WHEN 'edit' THEN 'blog_updated'
          ELSE raw_name
        END
      WHEN 'blog_deleted' THEN 'content_deleted'
      WHEN 'blog_liked' THEN 'content_liked'
      WHEN 'blog_comment_posted' THEN 'comment_posted'
      WHEN 'blog_quest_linked' THEN 'blog_editor_action'
      WHEN 'blog_previewed' THEN 'blog_editor_action'
      WHEN 'blog_quest_opened' THEN 'blog_quest_click'
      ELSE raw_name
    END AS name
  FROM deduped
),

rewritten AS (
  SELECT
    event_id,
    raw_name,
    name,
    distinct_id,
    exported_ts,
    raw_env,
    CASE
      WHEN raw_name = 'create_option_tapped' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.option', CASE JSON_VALUE(props, '$.option') WHEN 'quest' THEN 0 WHEN 'blog' THEN 1 END,
            '$.available_flg', SAFE_CAST(JSON_VALUE(props, '$.available') AS BOOL)
          ),
          '$.available'
        )
      WHEN raw_name = 'blog_managed' AND JSON_VALUE(props, '$.action') = 'visibility' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.content_type', 1,
            '$.content_id', JSON_VALUE(props, '$.blog_id'),
            '$.to_visibility',
            CASE JSON_VALUE(props, '$.value') WHEN 'public' THEN 0 WHEN 'unlisted' THEN 1 WHEN 'private' THEN 2 END
          ),
          '$.blog_id', '$.action', '$.value'
        )
      WHEN raw_name = 'blog_managed' AND JSON_VALUE(props, '$.action') = 'comments' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.content_type', 1,
            '$.content_id', JSON_VALUE(props, '$.blog_id'),
            '$.comments_on_flg', CASE JSON_VALUE(props, '$.value') WHEN 'on' THEN TRUE WHEN 'off' THEN FALSE END
          ),
          '$.blog_id', '$.action', '$.value'
        )
      WHEN raw_name = 'blog_managed' AND JSON_VALUE(props, '$.action') = 'delete' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.content_type', 1,
            '$.content_id', JSON_VALUE(props, '$.blog_id'),
            '$.was_published_flg', TRUE
          ),
          '$.blog_id', '$.action', '$.value'
        )
      WHEN raw_name = 'blog_managed' AND JSON_VALUE(props, '$.action') = 'edit' THEN
        JSON_REMOVE(props, '$.action', '$.value')
      WHEN raw_name = 'blog_deleted' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.content_type', 1,
            '$.content_id', JSON_VALUE(props, '$.blog_id'),
            '$.was_published_flg', FALSE,
            '$.photo_count', SAFE_CAST(JSON_VALUE(props, '$.photos') AS INT64)
          ),
          '$.blog_id', '$.status', '$.photos', '$.chars_bucket', '$.has_quest'
        )
      WHEN raw_name = 'blog_liked' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.content_type', 1,
            '$.content_id', JSON_VALUE(props, '$.blog_id'),
            '$.unlike_flg', SAFE_CAST(JSON_VALUE(props, '$.unlike') AS BOOL),
            '$.source',
            CASE JSON_VALUE(props, '$.source') WHEN 'blog_page' THEN 0 WHEN 'feed' THEN 2 WHEN 'after_sign_in' THEN 3 END
          ),
          '$.blog_id', '$.unlike'
        )
      WHEN raw_name = 'blog_comment_posted' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.content_type', 1,
            '$.content_id', JSON_VALUE(props, '$.blog_id'),
            '$.comment_length', SAFE_CAST(JSON_VALUE(props, '$.length') AS INT64)
          ),
          '$.blog_id', '$.length'
        )
      WHEN raw_name = 'legal_page_viewed' THEN
        JSON_SET(
          props,
          '$.page',
          CASE JSON_VALUE(props, '$.page')
            WHEN 'privacy' THEN 0
            WHEN 'terms' THEN 1
            ELSE SAFE_CAST(JSON_VALUE(props, '$.page') AS INT64)
          END,
          '$.source',
          CASE JSON_VALUE(props, '$.source')
            WHEN 'sign_in' THEN 0
            WHEN 'settings' THEN 1
            WHEN 'footer' THEN 2
            WHEN 'direct' THEN 3
            ELSE SAFE_CAST(JSON_VALUE(props, '$.source') AS INT64)
          END
        )
      WHEN raw_name = 'blog_create_started' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.click_loc',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.click_loc') AS INT64),
              CASE JSON_VALUE(props, '$.source') WHEN 'create' THEN 0 WHEN 'write_your_own' THEN 1 END
            )
          ),
          '$.source'
        )
      WHEN raw_name = 'blog_quest_linked' THEN
        JSON_SET(props, '$.action', CASE JSON_VALUE(props, '$.action') WHEN 'link' THEN 3 WHEN 'remove' THEN 7 END)
      WHEN raw_name = 'blog_previewed' THEN
        JSON_SET(props, '$.action', 5)
      WHEN raw_name = 'blog_draft_saved' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.photo_count',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.photo_count') AS INT64),
              SAFE_CAST(JSON_VALUE(props, '$.photos') AS INT64)
            )
          ),
          '$.photos'
        )
      WHEN raw_name = 'blog_published' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.visibility',
            CASE JSON_VALUE(props, '$.visibility')
              WHEN 'public' THEN 0
              WHEN 'unlisted' THEN 1
              WHEN 'private' THEN 2
              ELSE SAFE_CAST(JSON_VALUE(props, '$.visibility') AS INT64)
            END,
            '$.photo_count',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.photo_count') AS INT64),
              SAFE_CAST(JSON_VALUE(props, '$.photos') AS INT64)
            ),
            '$.has_quest_flg',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.has_quest_flg') AS BOOL),
              SAFE_CAST(JSON_VALUE(props, '$.has_quest') AS BOOL)
            ),
            '$.has_place_flg',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.has_place_flg') AS BOOL),
              SAFE_CAST(JSON_VALUE(props, '$.has_place') AS BOOL)
            )
          ),
          '$.photos', '$.has_quest', '$.has_place'
        )
      WHEN raw_name = 'blog_viewed' THEN
        JSON_REMOVE(
          JSON_SET(
            props,
            '$.signed_in_flg',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.signed_in_flg') AS BOOL),
              SAFE_CAST(JSON_VALUE(props, '$.signed_in') AS BOOL)
            ),
            '$.referrer',
            CASE JSON_VALUE(props, '$.referrer')
              WHEN 'none' THEN 0
              WHEN 'whatsapp' THEN 1
              WHEN 'instagram' THEN 2
              WHEN 'other' THEN 3
              ELSE SAFE_CAST(JSON_VALUE(props, '$.referrer') AS INT64)
            END,
            '$.has_quest_flg',
            COALESCE(
              SAFE_CAST(JSON_VALUE(props, '$.has_quest_flg') AS BOOL),
              SAFE_CAST(JSON_VALUE(props, '$.has_quest') AS BOOL)
            )
          ),
          '$.signed_in', '$.has_quest'
        )
      ELSE props
    END AS props
  FROM renamed
),

common AS (
  SELECT
    event_id,
    name,
    COALESCE(
      JSON_VALUE(props, '$.type'),
      -- The v2 type of each event (taxonomyV2.ts; metricsSql.test.ts checks these lists).
      CASE
        WHEN name IN (
          'account_delete_click', 'blog_editor_action', 'blog_format_click',
          'blog_quest_click', 'comment_box_open', 'create_option_click', 'create_quest_click',
          'draft_resumed', 'feed_load_more_click', 'feedback_click', 'instagram_export',
          'manage_menu_open', 'notification_click', 'photos_selected', 'preview_exit',
          'profile_tab_click', 'quest_edit', 'quest_fullscreen', 'quest_page_turn',
          'quest_photo_click', 'report_click', 'search', 'search_result_click', 'share_click',
          'sign_in_click', 'tab_click', 'template_select', 'welcome_click',
          'whats_a_quest_click'
        ) THEN 'click'
        WHEN name IN (
          'app_opened', 'blog_create_started', 'blog_unavailable', 'blog_viewed',
          'error_shown', 'explore_viewed', 'follow_list_viewed', 'guide_viewed', 'home_viewed',
          'legal_page_viewed', 'photo_limit_hit', 'profile_viewed', 'quest_preview',
          'quest_unavailable', 'quest_viewed', 'settings_viewed', 'username_rejected',
          'welcome_step_viewed'
        ) THEN 'view'
        WHEN name IN (
          'blog_read_end', 'quest_create_abandoned', 'quest_view_ended'
        ) THEN 'client'
        WHEN name IN (
          'account_deleted', 'blog_draft_saved', 'blog_published', 'blog_updated',
          'comment_deleted', 'comment_posted', 'comments_toggled', 'content_deleted',
          'content_liked', 'notification_sent', 'profile_updated', 'quest_arranged',
          'quest_creation_complete', 'quest_draft_created', 'quest_updated', 'setting_changed',
          'user_followed', 'user_signed_in', 'user_signed_out', 'user_signed_up',
          'username_set', 'visibility_changed'
        ) THEN 'server'
        -- Page views count as views for DAU (Metrics "Daily / weekly active users").
        WHEN name = '$pageview' THEN 'view'
      END
    ) AS type,
    COALESCE(raw_env, 'production') AS env,
    exported_ts AS ts,
    raw_env,
    exported_ts,
    COALESCE(
      JSON_VALUE(props, '$.user_id'),
      IF(raw_env IS NULL AND NOT STARTS_WITH(distinct_id, 'anon_'), distinct_id, NULL)
    ) AS user_id,
    COALESCE(
      JSON_VALUE(props, '$.anon_id'),
      IF(raw_env IS NULL AND STARTS_WITH(distinct_id, 'anon_'), distinct_id, NULL)
    ) AS anon_id,
    JSON_VALUE(props, '$.session_id') AS session_id,
    CASE JSON_VALUE(props, '$.platform')
      WHEN 'web_mobile' THEN 0
      WHEN 'web_desktop' THEN 1
      ELSE SAFE_CAST(JSON_VALUE(props, '$.platform') AS INT64)
    END AS platform,
    JSON_VALUE(props, '$.os') AS os,
    JSON_VALUE(props, '$.browser') AS browser,
    JSON_VALUE(props, '$.screen') AS screen,
    JSON_VALUE(props, '$.country') AS country,
    JSON_VALUE(props, '$.app_version') AS app_version,
    SAFE.TIMESTAMP(JSON_VALUE(props, '$.client_ts')) AS sent_client_ts,
    JSON_QUERY(props, '$.user_info') AS user_info,
    JSON_REMOVE(props, '$.user_info', '$."$ip"') AS properties
  FROM rewritten
),

kept AS (
  SELECT candidate.*
  FROM common AS candidate
  LEFT JOIN (SELECT DISTINCT user_id FROM `onquest_analytics.deleted_users`) AS deleted_user
    ON deleted_user.user_id = candidate.user_id
  LEFT JOIN (SELECT DISTINCT anon_id, user_id FROM `onquest_analytics.deleted_devices`) AS deleted_device
    ON deleted_device.anon_id = candidate.anon_id
    -- Shared-device guard (same as the erasure DELETE): only signed-out rows or the deleted
    -- person's own rows. Another person's signed-in rows on that device stay.
    AND (candidate.user_id IS NULL OR candidate.user_id = deleted_device.user_id)
  WHERE candidate.name = 'account_deleted'
    OR (deleted_user.user_id IS NULL AND deleted_device.anon_id IS NULL)
),

filled AS (
  SELECT
    * EXCEPT (anon_id, browser_anon_id),
    COALESCE(
      anon_id,
      IF(
        user_id IS NULL OR name IN ('notification_sent', 'account_deleted'),
        NULL,
        COALESCE(
          LAST_VALUE(browser_anon_id IGNORE NULLS) OVER user_until_now,
          FIRST_VALUE(browser_anon_id IGNORE NULLS) OVER user_from_now
        )
      )
    ) AS anon_id
  FROM (SELECT *, IF(type != 'server', anon_id, NULL) AS browser_anon_id FROM kept)
  WINDOW
    user_until_now AS (
      PARTITION BY user_id ORDER BY ts, event_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    user_from_now AS (
      PARTITION BY user_id ORDER BY ts, event_id ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
    )
)

SELECT
  event_id,
  name,
  type,
  env,
  ts,
  COALESCE(sent_client_ts, IF(raw_env IS NULL AND type != 'server', exported_ts, NULL)) AS client_ts,
  user_id,
  anon_id,
  session_id,
  platform,
  os,
  browser,
  screen,
  country,
  app_version,
  CASE
    WHEN name = 'user_signed_up' AND anon_id IS NOT NULL THEN
      JSON_SET(properties, '$.first_seen_ts', MIN(ts) OVER (PARTITION BY anon_id))
    WHEN name = 'user_signed_in' THEN
      JSON_SET(properties, '$.days_since_last_sign_in', TIMESTAMP_DIFF(ts, LAG(ts) OVER sign_ins, DAY))
    ELSE properties
  END AS properties,
  -- DAU: the user, else the user last seen on this device, else the device.
  COALESCE(
    user_id,
    IF(anon_id IS NULL, NULL, LAST_VALUE(user_id IGNORE NULLS) OVER device),
    anon_id
  ) AS person_id,
  user_info
FROM filled
WINDOW
  sign_ins AS (PARTITION BY user_id, name IN ('user_signed_up', 'user_signed_in') ORDER BY ts),
  device AS (PARTITION BY anon_id ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);

-- ==== events_clean_all.sql ====
-- events_clean_all: events_people_all without user_info (no email, username or city), both
-- environments. For Preview checks: add WHERE env = 'preview'. docs/specs/analytics-v2.md §5.3.
CREATE OR REPLACE VIEW `onquest_analytics.events_clean_all`
OPTIONS (
  description = 'v2 events without user_info, all environments (analytics-v2 spec 5.3). Add WHERE env = preview for Preview checks.'
)
AS
SELECT * EXCEPT (user_info)
FROM `onquest_analytics.events_people_all`;

-- ==== events_clean.sql ====
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

-- ==== events_people.sql ====
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
