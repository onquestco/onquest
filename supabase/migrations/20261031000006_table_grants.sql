-- Explicit table access, so the database behaves the same whatever the project's
-- "automatically expose new tables" setting is. RLS still decides which rows a user reaches.
-- Logged-out visitors get no table access at all: they read through the public functions.

revoke all on public.profiles, public.trips, public.photos, public.places from anon;

grant select, insert, update, delete on public.profiles, public.trips, public.photos, public.places
  to authenticated;

-- Used only by lib/supabase/admin.ts (account deletion).
grant select, insert, update, delete on public.profiles, public.trips, public.photos, public.places
  to service_role;
