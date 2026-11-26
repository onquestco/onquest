-- events_people_all: every PostHog event in v2 terms, both environments, WITH user_info (email,
-- username, city). Founders only (decision 0004). Everyone else reads events_clean, which is this
-- view without user_info and filtered to env = 'production'. docs/specs/analytics-v2.md §5.3.
--
-- Reads the PostHog batch export `onquest_analytics.events`, whose `properties` column is JSON
-- (confirmed by the CTO at G1, 26 Nov 2026).
--
-- What it does, in order:
--   raw        $-events dropped except $pageview. Only uuid, event, distinct_id, timestamp,
--              properties and site_url are read: never ip, set, set_once, person_properties or
--              elements (raw IP and PostHog person/location data).
--   deduped    one row per event_id; is_bot_flg = true dropped.
--   renamed    v1 names → v2 names (the table in spec §5.3, same as lib/analytics/renameMap.ts).
--   rewritten  v1 property names and string values → v2. Each branch leaves a v2 row unchanged,
--              so rows sent after the cut-over with the same name pass through.
--   common     the common columns, and `properties` rebuilt from an allowlist: the v2 taxonomy
--              properties, the common properties and $current_url / $pathname (route templates
--              on $pageview). Every other key goes, so no $geoip_*, $set, $ip or lat/long ever
--              reaches a view; user_info is its own column. Rows without env (v1, and v2 before
--              AN-03) take it from the first of $current_url, $host, site_url whose host is ours:
--              onquest.in / www.onquest.in → production, *.vercel.app or localhost → preview;
--              none → production. Their user_id is a distinct_id that isn't anon_…, their anon_id
--              the anon_… distinct_id, their country $geoip_country_code.
--   kept       deleted people's rows left out (deleted_users, deleted_devices with the
--              shared-device guard), except account_deleted.
--   filled     server events' null anon_id filled from the same user's browser rows while the
--              oq_actx cookie is off: the latest at or before the event, else the earliest after.
--   (final)    person_id for DAU; first_seen_ts and days_since_last_sign_in derived (spec D7).
--
-- Environments: the anon_id fill, person_id and the derived properties are computed across both
-- environments before events_clean filters to production. That's safe only because Preview's
-- user keys and anon ids never match Production's (separate Supabase projects and origins, D15).
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
    properties AS props,
    site_url
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
    site_url,
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
    site_url,
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
    COALESCE(
      raw_env,
      (
        SELECT IF(host IN ('onquest.in', 'www.onquest.in'), 'production', 'preview')
        FROM UNNEST([
          LOWER(NET.HOST(JSON_VALUE(props, '$."$current_url"'))),
          LOWER(NET.HOST(JSON_VALUE(props, '$."$host"'))),
          LOWER(NET.HOST(site_url))
        ]) AS host WITH OFFSET AS position
        -- Only our own hosts decide; anything else (e.g. PostHog's own URL) is ignored.
        WHERE host IN ('onquest.in', 'www.onquest.in', 'localhost', '127.0.0.1') OR ENDS_WITH(host, '.vercel.app')
        ORDER BY position
        LIMIT 1
      ),
      'production'
    ) AS env,
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
    COALESCE(
      JSON_VALUE(props, '$.country'),
      -- v1 browser rows: PostHog GeoIP, country only (nothing finer is ever read).
      IF(raw_env IS NULL, JSON_VALUE(props, '$."$geoip_country_code"'), NULL)
    ) AS country,
    JSON_VALUE(props, '$.app_version') AS app_version,
    SAFE.TIMESTAMP(JSON_VALUE(props, '$.client_ts')) AS sent_client_ts,
    JSON_QUERY(props, '$.user_info') AS user_info,
    -- Allowlist (metricsSql.test.ts checks it equals the taxonomy's keys). allowlist:start
    JSON_STRIP_NULLS(
      JSON_OBJECT(
        '$current_url', JSON_QUERY(props, '$."$current_url"'),
        '$pathname', JSON_QUERY(props, '$."$pathname"'),
        'action', JSON_QUERY(props, '$.action'),
        'action_taken', JSON_QUERY(props, '$.action_taken'),
        'actor_user_id', JSON_QUERY(props, '$.actor_user_id'),
        'age_days', JSON_QUERY(props, '$.age_days'),
        'age_hours', JSON_QUERY(props, '$.age_hours'),
        'anon_id', JSON_QUERY(props, '$.anon_id'),
        'app_version', JSON_QUERY(props, '$.app_version'),
        'arrange_mode', JSON_QUERY(props, '$.arrange_mode'),
        'attempt', JSON_QUERY(props, '$.attempt'),
        'author_user_id', JSON_QUERY(props, '$.author_user_id'),
        'available_flg', JSON_QUERY(props, '$.available_flg'),
        'blocked_flg', JSON_QUERY(props, '$.blocked_flg'),
        'blog_count', JSON_QUERY(props, '$.blog_count'),
        'blog_id', JSON_QUERY(props, '$.blog_id'),
        'browser', JSON_QUERY(props, '$.browser'),
        'caption_was_auto_flg', JSON_QUERY(props, '$.caption_was_auto_flg'),
        'captions_auto_count', JSON_QUERY(props, '$.captions_auto_count'),
        'captions_auto_kept', JSON_QUERY(props, '$.captions_auto_kept'),
        'captions_user_written', JSON_QUERY(props, '$.captions_user_written'),
        'change_types', JSON_QUERY(props, '$.change_types'),
        'channel', JSON_QUERY(props, '$.channel'),
        'chars_bucket', JSON_QUERY(props, '$.chars_bucket'),
        'chip_count', JSON_QUERY(props, '$.chip_count'),
        'chip_name', JSON_QUERY(props, '$.chip_name'),
        'click_loc', JSON_QUERY(props, '$.click_loc'),
        'client_ts', JSON_QUERY(props, '$.client_ts'),
        'comment_age_hours', JSON_QUERY(props, '$.comment_age_hours'),
        'comment_count', JSON_QUERY(props, '$.comment_count'),
        'comment_length', JSON_QUERY(props, '$.comment_length'),
        'comments_on_flg', JSON_QUERY(props, '$.comments_on_flg'),
        'completed_flg', JSON_QUERY(props, '$.completed_flg'),
        'content_id', JSON_QUERY(props, '$.content_id'),
        'content_type', JSON_QUERY(props, '$.content_type'),
        'country', JSON_QUERY(props, '$.country'),
        'days_since_last_edit', JSON_QUERY(props, '$.days_since_last_edit'),
        'days_since_last_sign_in', JSON_QUERY(props, '$.days_since_last_sign_in'),
        'days_since_post', JSON_QUERY(props, '$.days_since_post'),
        'days_since_publish', JSON_QUERY(props, '$.days_since_publish'),
        'days_since_signup', JSON_QUERY(props, '$.days_since_signup'),
        'default_visibility', JSON_QUERY(props, '$.default_visibility'),
        'deleted_by', JSON_QUERY(props, '$.deleted_by'),
        'direction', JSON_QUERY(props, '$.direction'),
        'draft_count', JSON_QUERY(props, '$.draft_count'),
        'duration_ms', JSON_QUERY(props, '$.duration_ms'),
        'edit_count', JSON_QUERY(props, '$.edit_count'),
        'entry_type', JSON_QUERY(props, '$.entry_type'),
        'env', JSON_QUERY(props, '$.env'),
        'error_type', JSON_QUERY(props, '$.error_type'),
        'event_id', JSON_QUERY(props, '$.event_id'),
        'exit_type', JSON_QUERY(props, '$.exit_type'),
        'failed_count', JSON_QUERY(props, '$.failed_count'),
        'failed_flg', JSON_QUERY(props, '$.failed_flg'),
        'feed_empty_flg', JSON_QUERY(props, '$.feed_empty_flg'),
        'feed_item_count', JSON_QUERY(props, '$.feed_item_count'),
        'fields_changed', JSON_QUERY(props, '$.fields_changed'),
        'filter', JSON_QUERY(props, '$.filter'),
        'first_open_flg', JSON_QUERY(props, '$.first_open_flg'),
        'first_seen_ts', JSON_QUERY(props, '$.first_seen_ts'),
        'first_time_flg', JSON_QUERY(props, '$.first_time_flg'),
        'follower_count', JSON_QUERY(props, '$.follower_count'),
        'following_count', JSON_QUERY(props, '$.following_count'),
        'following_count_after', JSON_QUERY(props, '$.following_count_after'),
        'follows_flg', JSON_QUERY(props, '$.follows_flg'),
        'follows_owner_flg', JSON_QUERY(props, '$.follows_owner_flg'),
        'format', JSON_QUERY(props, '$.format'),
        'from_screen', JSON_QUERY(props, '$.from_screen'),
        'from_visibility', JSON_QUERY(props, '$.from_visibility'),
        'fullscreen_flg', JSON_QUERY(props, '$.fullscreen_flg'),
        'guide_id', JSON_QUERY(props, '$.guide_id'),
        'has_place_flg', JSON_QUERY(props, '$.has_place_flg'),
        'has_quest_flg', JSON_QUERY(props, '$.has_quest_flg'),
        'heic_count', JSON_QUERY(props, '$.heic_count'),
        'is_bot_flg', JSON_QUERY(props, '$.is_bot_flg'),
        'is_draft_flg', JSON_QUERY(props, '$.is_draft_flg'),
        'is_first_blog_flg', JSON_QUERY(props, '$.is_first_blog_flg'),
        'is_first_quest_flg', JSON_QUERY(props, '$.is_first_quest_flg'),
        'is_mutual_flg', JSON_QUERY(props, '$.is_mutual_flg'),
        'is_owner_flg', JSON_QUERY(props, '$.is_owner_flg'),
        'is_published_flg', JSON_QUERY(props, '$.is_published_flg'),
        'is_self_flg', JSON_QUERY(props, '$.is_self_flg'),
        'item_count', JSON_QUERY(props, '$.item_count'),
        'kind', JSON_QUERY(props, '$.kind'),
        'landing_page', JSON_QUERY(props, '$.landing_page'),
        'like_count', JSON_QUERY(props, '$.like_count'),
        'like_count_after', JSON_QUERY(props, '$.like_count_after'),
        'limit', JSON_QUERY(props, '$.limit'),
        'list', JSON_QUERY(props, '$.list'),
        'load_time_ms', JSON_QUERY(props, '$.load_time_ms'),
        'looped_flg', JSON_QUERY(props, '$.looped_flg'),
        'loops', JSON_QUERY(props, '$.loops'),
        'method', JSON_QUERY(props, '$.method'),
        'minutes_since_start', JSON_QUERY(props, '$.minutes_since_start'),
        'no_metadata_count', JSON_QUERY(props, '$.no_metadata_count'),
        'no_results_flg', JSON_QUERY(props, '$.no_results_flg'),
        'on_flg', JSON_QUERY(props, '$.on_flg'),
        'option', JSON_QUERY(props, '$.option'),
        'os', JSON_QUERY(props, '$.os'),
        'own_quest_count', JSON_QUERY(props, '$.own_quest_count'),
        'owner_user_id', JSON_QUERY(props, '$.owner_user_id'),
        'page', JSON_QUERY(props, '$.page'),
        'page_count', JSON_QUERY(props, '$.page_count'),
        'page_no', JSON_QUERY(props, '$.page_no'),
        'pages_seen', JSON_QUERY(props, '$.pages_seen'),
        'people_count', JSON_QUERY(props, '$.people_count'),
        'photo_count', JSON_QUERY(props, '$.photo_count'),
        'photo_count_after', JSON_QUERY(props, '$.photo_count_after'),
        'photo_removed_flg', JSON_QUERY(props, '$.photo_removed_flg'),
        'pick_time_sec', JSON_QUERY(props, '$.pick_time_sec'),
        'place_count', JSON_QUERY(props, '$.place_count'),
        'platform', JSON_QUERY(props, '$.platform'),
        'position', JSON_QUERY(props, '$.position'),
        'prev_template', JSON_QUERY(props, '$.prev_template'),
        'profile_user_id', JSON_QUERY(props, '$.profile_user_id'),
        'public_quest_count', JSON_QUERY(props, '$.public_quest_count'),
        'query_length', JSON_QUERY(props, '$.query_length'),
        'quest_count', JSON_QUERY(props, '$.quest_count'),
        'quest_id', JSON_QUERY(props, '$.quest_id'),
        'read_time_min', JSON_QUERY(props, '$.read_time_min'),
        'reason', JSON_QUERY(props, '$.reason'),
        'referrer', JSON_QUERY(props, '$.referrer'),
        'referrer_blog_id', JSON_QUERY(props, '$.referrer_blog_id'),
        'referrer_content_type', JSON_QUERY(props, '$.referrer_content_type'),
        'referrer_owner_user_id', JSON_QUERY(props, '$.referrer_owner_user_id'),
        'referrer_quest_id', JSON_QUERY(props, '$.referrer_quest_id'),
        'rejected_attempts', JSON_QUERY(props, '$.rejected_attempts'),
        'result_people_count', JSON_QUERY(props, '$.result_people_count'),
        'result_quest_count', JSON_QUERY(props, '$.result_quest_count'),
        'result_story_count', JSON_QUERY(props, '$.result_story_count'),
        'result_type', JSON_QUERY(props, '$.result_type'),
        'screen', JSON_QUERY(props, '$.screen'),
        'seconds', JSON_QUERY(props, '$.seconds'),
        'seconds_since_start', JSON_QUERY(props, '$.seconds_since_start'),
        'session_id', JSON_QUERY(props, '$.session_id'),
        'setting', JSON_QUERY(props, '$.setting'),
        'signed_in_flg', JSON_QUERY(props, '$.signed_in_flg'),
        'slide_count', JSON_QUERY(props, '$.slide_count'),
        'source', JSON_QUERY(props, '$.source'),
        'step', JSON_QUERY(props, '$.step'),
        'story_count', JSON_QUERY(props, '$.story_count'),
        'suggested_item_count', JSON_QUERY(props, '$.suggested_item_count'),
        'tab', JSON_QUERY(props, '$.tab'),
        'target_user_id', JSON_QUERY(props, '$.target_user_id'),
        'template', JSON_QUERY(props, '$.template'),
        'template_changed_flg', JSON_QUERY(props, '$.template_changed_flg'),
        'title_length', JSON_QUERY(props, '$.title_length'),
        'to_visibility', JSON_QUERY(props, '$.to_visibility'),
        'total_pages', JSON_QUERY(props, '$.total_pages'),
        'trending_count', JSON_QUERY(props, '$.trending_count'),
        'trigger', JSON_QUERY(props, '$.trigger'),
        'type', JSON_QUERY(props, '$.type'),
        'unfollow_flg', JSON_QUERY(props, '$.unfollow_flg'),
        'unlike_flg', JSON_QUERY(props, '$.unlike_flg'),
        'unread_count', JSON_QUERY(props, '$.unread_count'),
        'user_id', JSON_QUERY(props, '$.user_id'),
        'username_length', JSON_QUERY(props, '$.username_length'),
        'utm_source', JSON_QUERY(props, '$.utm_source'),
        'value', JSON_QUERY(props, '$.value'),
        'via', JSON_QUERY(props, '$.via'),
        'view_id', JSON_QUERY(props, '$.view_id'),
        'visibility', JSON_QUERY(props, '$.visibility'),
        'was_published_flg', JSON_QUERY(props, '$.was_published_flg'),
        'with_date_count', JSON_QUERY(props, '$.with_date_count'),
        'with_location_count', JSON_QUERY(props, '$.with_location_count')
      )
    ) AS properties
    -- allowlist:end
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
  -- DAU: the user, else the user last seen on this device (over all time, so a past day's count
  -- can change when a device later signs in to another account), else the device.
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
