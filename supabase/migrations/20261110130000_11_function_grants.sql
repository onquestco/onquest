-- Lock down who may call which function, whatever the project's defaults.
--
-- Supabase grants EXECUTE on every new function in `public` straight to anon, authenticated and
-- service_role (default privileges), so the `revoke ... from public` lines in migrations 8-10
-- removed nothing: signed-out callers could run run_retention_cleanup, claim_email_budget,
-- save_profile_settings_as_admin, geocode_cache_put and get_unavailable_trip_key over the API.
-- Found by the Supabase security advisor on preview, 10 Nov. tests/db/grants.test.ts keeps it shut.

-- 1. Start from nothing, then grant exactly what the app calls.
revoke execute on all functions in schema public from public, anon, authenticated, service_role;

-- Public pages (signed out or in).
grant execute on function public.get_trip(text, text), public.get_profile(text),
  public.list_sitemap_trips(), public.get_trip_social(uuid), public.get_trip_status(text, text)
  to anon, authenticated;

-- Signed-in users. Each checks auth.uid() itself.
grant execute on function public.is_handle_available(text), public.save_profile(text, jsonb),
  public.create_trip(uuid, text), public.save_trip_draft(uuid, text, jsonb),
  public.publish_trip(uuid, text, text, text, text, text, int),
  public.set_trip_visibility(uuid, text, text), public.set_trip_comments(uuid, text, boolean),
  public.delete_trip(uuid), public.set_like(uuid, boolean), public.post_comment(uuid, text),
  public.delete_comment(uuid), public.get_my_quest_state(uuid),
  public.list_my_notifications(int, text), public.count_unread_notifications(),
  public.mark_notifications_seen(text)
  to authenticated;

-- Server only (lib/supabase/admin.ts and the weekly cron job, which runs as postgres).
grant execute on function public.geocode_cache_get(text[]), public.geocode_cache_put(text, jsonb),
  public.claim_geocoder_slot(uuid, text), public.run_retention_cleanup(timestamptz),
  public.get_unavailable_trip_key(text, text), public.claim_email_budget(text, int),
  public.save_profile_settings_as_admin(uuid, jsonb)
  to service_role;

-- Helpers (require_user, can_see_trip, trip_url_hash, archive_*, ...) get no grants: only the
-- functions above call them, as their owner.

-- 2. Functions and tables added later start with no access; each migration grants what it needs.
alter default privileges in schema public revoke execute on functions from anon, authenticated, service_role;
-- Postgres lets every role call a new function unless told otherwise; this setting can only be
-- removed without "in schema". Only our migrations create functions as this role.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;

-- 3. Table rights nobody uses. TRUNCATE skips row level security, so no client role keeps it.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated, service_role;
