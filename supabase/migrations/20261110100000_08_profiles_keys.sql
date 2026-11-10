-- Profiles under decision 0001 (spec A §3.1, §5 step 2): one permanent `key`, rows never change.
-- Every save archives the live row and inserts the new one in save_profile(), in one transaction.

-- 1. Foreign keys first. A save deletes and re-inserts the profile row, so nothing may cascade
--    from it: trips and photos now check their owner at commit, when the row exists again.
alter table public.trips drop constraint trips_owner_id_fkey;
alter table public.trips add constraint trips_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete no action deferrable initially deferred;
alter table public.photos drop constraint photos_owner_id_fkey;
alter table public.photos add constraint photos_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete no action deferrable initially deferred;

-- 2. The key and the save metadata (0001 rule 6).
alter table public.profiles rename column id to key;
alter table public.profiles
  add column settings    jsonb       not null default '{}',
  add column saved_at    timestamptz not null default clock_timestamp(),
  add column saved_by    uuid,
  add column save_reason text        not null default 'create'
    check (save_reason in ('create', 'save', 'publish', 'visibility', 'comments', 'delete'));

-- Same columns plus archived_at. Many rows per key, so no unique constraints or foreign keys.
create table public.profiles_archive (
  key         uuid        not null,
  handle      text        not null,
  name        text,
  bio         text,
  home_city   text,
  avatar_url  text,
  created_at  timestamptz not null,
  settings    jsonb       not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null,
  archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- Every handle a profile has ever had. Insert-only and kept forever, even after the account is
-- deleted: usernames are never reused (CTO, 10 Nov), so an old shared link can't be taken over.
create table public.handle_claims (
  handle      text primary key check (handle ~ '^[a-z0-9_]{3,20}$'),
  profile_key uuid        not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);
insert into public.handle_claims (handle, profile_key, saved_at, saved_by, save_reason)
  select handle, key, created_at, key, 'create' from public.profiles;

-- 3. Access: owners read their own rows; every write goes through the functions below.
drop policy "own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated
  using (key = (select auth.uid()));
revoke insert, update, delete on public.profiles from authenticated;
revoke update on public.profiles from service_role;

alter table public.profiles_archive enable row level security;
create policy "read own archived profiles" on public.profiles_archive for select to authenticated
  using (key = (select auth.uid()));
revoke all on public.profiles_archive from anon, authenticated, service_role;
grant select on public.profiles_archive to authenticated, service_role;

alter table public.handle_claims enable row level security;
revoke all on public.handle_claims from anon, authenticated, service_role;

-- 4. Words that can't be handles. Mirrors RESERVED_HANDLES in lib/handles.ts: keep both in step.
create function public.is_reserved_handle(p_handle text) returns boolean
language sql immutable set search_path = '' as $$
  select p_handle = any (array[
    'about', 'admin', 'api', 'app', 'auth', 'demo', 'email', 'explore', 'guides', 'help', 'home',
    'ingest', 'login', 'new', 'notifications', 'onboarding', 'onquest', 'people', 'privacy', 'quests',
    'settings', 'support', 'terms', 'trips', 'u', 'welcome', 'www'
  ]);
$$;

create function public.is_handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(p_handle) ~ '^[a-z0-9_]{3,20}$'
    and not public.is_reserved_handle(lower(p_handle))
    and not exists (
      select 1 from public.handle_claims c
      where c.handle = lower(p_handle) and c.profile_key is distinct from (select auth.uid())
    );
$$;

-- Creates (p_based_on null) or saves the signed-in user's profile. Returns the new saved_at as
-- text: the next save's conflict token. Errors: OQ401 not signed in, OQ404 no profile,
-- OQ409 conflict (changed elsewhere, or a profile already exists), OQ422 bad handle,
-- OQ423 handle taken or reserved.
create function public.save_profile(p_based_on text, p_profile jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key   uuid := auth.uid();
  live       public.profiles;
  new_handle text := lower(trim(p_profile ->> 'handle'));
  now_ts     timestamptz := clock_timestamp();
  claimed_by uuid;
begin
  if user_key is null then
    raise exception 'not signed in' using errcode = 'OQ401';
  end if;
  if new_handle is null or new_handle !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid handle' using errcode = 'OQ422';
  end if;
  if public.is_reserved_handle(new_handle) then
    raise exception 'handle reserved' using errcode = 'OQ423';
  end if;

  select * into live from public.profiles where key = user_key for update;
  if p_based_on is null then
    if live.key is not null then
      raise exception 'profile exists' using errcode = 'OQ409';
    end if;
  elsif live.key is null then
    -- A concurrent save may have replaced the row while we waited for the lock: re-read.
    if exists (select 1 from public.profiles where key = user_key) then
      raise exception 'conflict' using errcode = 'OQ409';
    end if;
    raise exception 'no profile' using errcode = 'OQ404';
  elsif live.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;

  -- Claim the handle. The primary key settles a race between two people wanting it at once.
  insert into public.handle_claims (handle, profile_key, saved_at, saved_by, save_reason)
    values (new_handle, user_key, now_ts, user_key, 'create')
    on conflict (handle) do nothing;
  select profile_key into claimed_by from public.handle_claims where handle = new_handle;
  if claimed_by <> user_key then
    raise exception 'handle taken' using errcode = 'OQ423';
  end if;

  if live.key is not null then
    insert into public.profiles_archive (key, handle, name, bio, home_city, avatar_url, created_at,
      settings, saved_at, saved_by, save_reason, archived_at)
    values (live.key, live.handle, live.name, live.bio, live.home_city, live.avatar_url, live.created_at,
      live.settings, live.saved_at, live.saved_by, live.save_reason, now_ts);
    delete from public.profiles where key = user_key;
  end if;

  -- Carried over: key, created_at, settings. From the caller: handle, name, bio, home_city, avatar_url.
  insert into public.profiles (key, handle, name, bio, home_city, avatar_url, created_at,
    settings, saved_at, saved_by, save_reason)
  values (user_key, new_handle, nullif(trim(p_profile ->> 'name'), ''), p_profile ->> 'bio',
    p_profile ->> 'home_city', p_profile ->> 'avatar_url', coalesce(live.created_at, now_ts),
    coalesce(live.settings, '{}'::jsonb), now_ts, user_key,
    case when live.key is null then 'create' else 'save' end);

  return now_ts::text;
end $$;

revoke execute on function public.is_reserved_handle(text), public.is_handle_available(text),
  public.save_profile(text, jsonb) from public;
grant execute on function public.is_handle_available(text), public.save_profile(text, jsonb) to authenticated;

-- 5. The public functions, unchanged except profiles.id → profiles.key. SQL function bodies are
--    stored as text, so the rename above doesn't reach them; without this every Quest page would
--    fail until migration 9. Output is byte-for-byte the same (tests/db/migration8.test.ts).
create or replace function public.get_trip(p_handle text, p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip', to_jsonb(t) - 'owner_id',
    'owner', jsonb_build_object('handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url),
    'photo_folder', t.owner_id::text || '/' || t.id::text,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ph.id, 'width', ph.width, 'height', ph.height, 'caption', ph.caption) order by ph.sort)
      from public.photos ph where ph.trip_id = t.id), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pl.id, 'name', pl.name, 'lat', pl.lat, 'lng', pl.lng,
        'note', pl.note, 'photo_id', pl.photo_id) order by pl.sort)
      from public.places pl where pl.trip_id = t.id), '[]'::jsonb)
  )
  from public.trips t
  join public.profiles p on p.key = t.owner_id
  where p.handle = lower(p_handle)
    and t.slug = lower(p_slug)
    and t.status = 'published'
    and t.visibility in ('public', 'unlisted');
$$;

create or replace function public.get_profile(p_handle text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p as (
    select * from public.profiles where handle = lower(p_handle)
  ),
  t as (
    select tr.* from public.trips tr join p on tr.owner_id = p.key
    where tr.status = 'published' and tr.visibility = 'public'
  ),
  pl as (
    select pl.*, t.slug as trip_slug from public.places pl join t on t.id = pl.trip_id
  )
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
      'handle', handle, 'name', name, 'bio', bio, 'home_city', home_city, 'avatar_url', avatar_url) from p),
    'stats', jsonb_build_object(
      'trips',     (select count(*) from t),
      'places',    (select count(distinct coalesce(geo_ref, lower(name))) from pl),
      'countries', (select count(distinct country_code) from pl),
      'days',      (select coalesce(sum(end_date - start_date + 1), 0) from t where start_date is not null and end_date is not null)
    ),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'slug', slug, 'title', title, 'short_title', short_title, 'template_id', template_id,
        'start_date', start_date, 'end_date', end_date, 'cover_photo_id', cover_photo_id)
        order by published_at desc)
      from t), '[]'::jsonb),
    'pins', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'lat', lat, 'lng', lng, 'trip_slug', trip_slug))
      from pl), '[]'::jsonb)
  )
  where exists (select 1 from p);
$$;

create or replace function public.list_sitemap_trips()
returns table (handle text, slug text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, t.slug, t.updated_at
  from public.trips t
  join public.profiles p on p.key = t.owner_id
  where t.status = 'published' and t.visibility = 'public' and t.word_count >= 80
  order by t.updated_at desc;
$$;
