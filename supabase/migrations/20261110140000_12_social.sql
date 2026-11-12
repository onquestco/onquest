-- Follows, profile additions, Quest cards, settings and account deletion (spec C §3.3, §3.7–3.9,
-- §4.3, §5). Same rules as migrations 9 and 10: rows never change, every write is a function,
-- foreign keys are deferred, and (since migration 11) nothing is callable until granted below.
-- Error codes: OQ401 not signed in, OQ404 not found, OQ409 conflict, OQ422 invalid.

-- 1. Tables.
create table public.follows (
  key          uuid        primary key,
  follower_key uuid        not null,
  followee_key uuid        not null,
  saved_at     timestamptz not null,
  saved_by     uuid,
  save_reason  text        not null check (save_reason = 'create'),
  unique (follower_key, followee_key), -- live rows only
  check (follower_key <> followee_key),
  constraint follows_follower_key_fkey foreign key (follower_key) references public.profiles (key)
    on delete no action deferrable initially deferred,
  constraint follows_followee_key_fkey foreign key (followee_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
create index follows_by_followee on public.follows (followee_key);
create index follows_by_follower on public.follows (follower_key);
create table public.follows_archive (
  key uuid not null, follower_key uuid not null, followee_key uuid not null, saved_at timestamptz not null,
  saved_by uuid, save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- "This account is being deleted": lets an interrupted deletion be finished (spec C §3.9).
-- Only the user's key, a random id. Service role only.
create table public.deleted_accounts (
  key         uuid        primary key,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);

alter table public.follows enable row level security;
alter table public.follows_archive enable row level security;
alter table public.deleted_accounts enable row level security;

create policy "read own follows" on public.follows for select to authenticated
  using ((select auth.uid()) in (follower_key, followee_key));
create policy "read own archived follows" on public.follows_archive for select to authenticated
  using ((select auth.uid()) in (follower_key, followee_key));

revoke all on public.follows, public.follows_archive, public.deleted_accounts
  from anon, authenticated, service_role;
grant select on public.follows, public.follows_archive to authenticated, service_role;
grant select on public.deleted_accounts to service_role;

-- 2. Follows (spec C §3.3). Idempotent set-state like set_like: repeated taps change nothing.
--    Notifies only on the first follow ever from that person.
create function public.set_follow(p_target_key uuid, p_follow boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  follower uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  live     public.follows;
  notified boolean := false;
begin
  if p_target_key = follower then
    raise exception 'cannot follow yourself' using errcode = 'OQ422';
  end if;
  if not exists (select 1 from public.profiles where key = p_target_key) then
    raise exception 'not found' using errcode = 'OQ404';
  end if;
  perform pg_advisory_xact_lock(hashtext('follow/' || follower::text || '/' || p_target_key::text));
  select * into live from public.follows f where f.follower_key = follower and f.followee_key = p_target_key;

  if p_follow and live.key is null then
    if not exists (select 1 from public.follows_archive a
                   where a.follower_key = follower and a.followee_key = p_target_key) then
      insert into public.notifications (key, recipient_key, kind, actor_key, trip_key, comment_key,
        saved_at, saved_by, save_reason)
      values (gen_random_uuid(), p_target_key, 'follow', follower, null, null, now_ts, follower, 'create');
      notified := true;
    end if;
    insert into public.follows (key, follower_key, followee_key, saved_at, saved_by, save_reason)
    values (gen_random_uuid(), follower, p_target_key, now_ts, follower, 'create');
  elsif not p_follow and live.key is not null then
    insert into public.follows_archive (key, follower_key, followee_key, saved_at, saved_by, save_reason, archived_at)
    values (live.key, live.follower_key, live.followee_key, live.saved_at, live.saved_by, live.save_reason, now_ts);
    delete from public.follows where key = live.key;
  end if;

  return jsonb_build_object(
    'following', p_follow,
    'notified', notified,
    'follower_count', (select count(*) from public.follows where followee_key = p_target_key));
end $$;

-- Which of these people I follow (for Follow buttons on lists).
create function public.get_my_follow_state(p_keys uuid[]) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(f.followee_key), '{}')
  from public.follows f
  where f.follower_key = auth.uid() and f.followee_key = any (p_keys[1:100]);
$$;

create function public.person_json(p public.profiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('key', p.key, 'handle', p.handle, 'name', coalesce(p.name, p.handle),
    'avatar_url', p.avatar_url, 'home_city', p.home_city);
$$;

create function public.list_follows(p_profile_key uuid, p_kind text, p_limit int default 30, p_offset int default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.person_json(p) order by f.saved_at desc, p.key), '[]'::jsonb)
  from (
    select f.saved_at,
      case when p_kind = 'followers' then f.follower_key else f.followee_key end as person_key
    from public.follows f
    where (p_kind = 'followers' and f.followee_key = p_profile_key)
       or (p_kind = 'following' and f.follower_key = p_profile_key)
    order by f.saved_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 50) offset greatest(coalesce(p_offset, 0), 0)
  ) f
  join public.profiles p on p.key = f.person_key;
$$;

-- 3. Old handles (spec C §3.7): the current handle of a live profile that ever claimed this one.
create function public.resolve_handle(p_handle text) returns text
language sql stable security definer set search_path = '' as $$
  select p.handle from public.handle_claims c join public.profiles p on p.key = c.profile_key
  where c.handle = lower(p_handle);
$$;

-- 4. Quest cards: one shape for Your Quests, Home, Explore, profiles and guides.
create function public.quest_card_json(t public.trips) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'key', t.key, 'title', t.title, 'status', t.status, 'visibility', t.visibility,
    'path', case when t.status = 'published' then '/@' || p.handle || '/' || t.slug end,
    'cover_photo_key', coalesce(t.cover_photo_key::text, t.photos -> 0 ->> 'id'),
    'photo_folder', t.owner_key::text || '/' || t.key::text,
    'page_count', jsonb_array_length(t.content -> 'days'),
    'photo_count', jsonb_array_length(t.photos),
    'places', coalesce((
      select jsonb_agg(name order by first) from (
        select place ->> 'name' as name, min(position) as first
        from jsonb_array_elements(t.places) with ordinality as list (place, position)
        group by place ->> 'name' order by min(position) limit 3) named), '[]'::jsonb),
    'like_count', (select count(*) from public.likes l where l.trip_key = t.key),
    'comment_count', case when t.comments_on
      then (select count(*) from public.comments c where c.trip_key = t.key) else 0 end,
    'published_at', t.published_at,
    'saved_at', t.saved_at::text,
    'owner', public.person_json(p))
  from public.profiles p where p.key = t.owner_key;
$$;

-- Guides' "Quests from this guide": public and published only, in the order given.
create function public.list_quest_cards(p_keys uuid[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.quest_card_json(t) order by k.position), '[]'::jsonb)
  from unnest(p_keys[1:20]) with ordinality as k (key, position)
  join public.trips t on t.key = k.key
  where t.status = 'published' and t.visibility = 'public';
$$;

-- Like and comment counts for Your Quests.
create function public.get_my_quest_counts() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', t.key,
    'like_count', (select count(*) from public.likes l where l.trip_key = t.key),
    'comment_count', (select count(*) from public.comments c where c.trip_key = t.key))), '[]'::jsonb)
  from public.trips t where t.owner_key = auth.uid();
$$;

-- Quests whose comment lists show my name and photo, for refreshing them after a profile edit.
create function public.list_my_comment_trip_keys() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct c.trip_key), '{}') from public.comments c where c.author_key = auth.uid();
$$;

-- 5. Profiles (spec C §3.7). Every field returned before is still returned; new ones added. With
--    "Show places on my profile" off, places and pins come back empty.
create or replace function public.get_profile(p_handle text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with p as (
    select * from public.profiles where handle = lower(p_handle)
  ),
  t as (
    select tr.* from public.trips tr join p on tr.owner_key = p.key
    where tr.status = 'published' and tr.visibility = 'public'
  ),
  pl as (
    select place ->> 'name' as name, (place ->> 'lat')::double precision as lat,
      (place ->> 'lng')::double precision as lng, place ->> 'geoRef' as geo_ref,
      place ->> 'countryCode' as country_code, t.slug as trip_slug, t.published_at, position
    from t, jsonb_array_elements(t.places) with ordinality as list (place, position)
  ),
  shown as (
    select pl.* from pl, p where coalesce((p.settings ->> 'showPlaces')::boolean, true)
  )
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
      'key', key, 'handle', handle, 'name', name, 'bio', bio, 'home_city', home_city,
      'avatar_url', avatar_url) from p),
    'stats', jsonb_build_object(
      'trips',     (select count(*) from t),
      'places',    (select count(distinct coalesce(geo_ref, lower(name))) from pl),
      'countries', (select count(distinct country_code) from pl),
      'days',      (select coalesce(sum(end_date - start_date + 1), 0) from t where start_date is not null and end_date is not null),
      'followers', (select count(*) from public.follows f, p where f.followee_key = p.key),
      'following', (select count(*) from public.follows f, p where f.follower_key = p.key)
    ),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', key, 'key', key, 'slug', slug, 'title', title, 'short_title', short_title,
        'template_id', template_id, 'start_date', start_date, 'end_date', end_date,
        'cover_photo_id', cover_photo_key, 'photo_folder', owner_key::text || '/' || key::text,
        'page_count', jsonb_array_length(content -> 'days'), 'photo_count', jsonb_array_length(photos))
        order by published_at desc)
      from t), '[]'::jsonb),
    'pins', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'lat', lat, 'lng', lng, 'trip_slug', trip_slug)
        order by published_at desc, position)
      from shown), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(name order by first) from (
        select name, min(published_at::text || lpad(position::text, 6, '0')) as first
        from shown group by name) named), '[]'::jsonb)
  )
  where exists (select 1 from p);
$$;

-- Profiles with at least one public Quest, for the sitemap.
create function public.list_sitemap_profiles()
returns table (handle text, saved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, p.saved_at from public.profiles p
  where exists (select 1 from public.trips t
                where t.owner_key = p.key and t.status = 'published' and t.visibility = 'public')
  order by p.saved_at desc;
$$;

-- 6. Settings (screen 17): merges the switches into the profile, carrying every other column.
create function public.save_profile_settings(p_based_on text, p_settings jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  live     public.profiles;
begin
  if jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'invalid settings' using errcode = 'OQ422';
  end if;
  select * into live from public.profiles where key = user_key for update;
  if live.key is null then
    if exists (select 1 from public.profiles where key = user_key) then
      raise exception 'conflict' using errcode = 'OQ409';
    end if;
    raise exception 'no profile' using errcode = 'OQ404';
  end if;
  if live.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;
  insert into public.profiles_archive (key, handle, name, bio, home_city, avatar_url, created_at,
    settings, saved_at, saved_by, save_reason, archived_at)
  values (live.key, live.handle, live.name, live.bio, live.home_city, live.avatar_url, live.created_at,
    live.settings, live.saved_at, live.saved_by, live.save_reason, now_ts);
  delete from public.profiles where key = user_key;
  insert into public.profiles (key, handle, name, bio, home_city, avatar_url, created_at,
    settings, saved_at, saved_by, save_reason)
  values (live.key, live.handle, live.name, live.bio, live.home_city, live.avatar_url, live.created_at,
    live.settings || p_settings, now_ts, user_key, 'save');
  return now_ts::text;
end $$;

-- 7. Account deletion (spec C §3.9). Service role only, one transaction, explicit deletes.
--    Keeps: URL tombstones and handle claims (usernames are never reused), the marker.
--    Returns what the server must refresh.
create function public.delete_account_data(p_user_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  now_ts       timestamptz := clock_timestamp();
  handles      text[];
  own_trips    jsonb;
  touched      uuid[];
  follow_keys  uuid[];
begin
  select coalesce(array_agg(handle order by saved_at), '{}') into handles
    from public.handle_claims where profile_key = p_user_key;
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'slug', slug)), '[]'::jsonb) into own_trips
    from public.trips where owner_key = p_user_key and published_at is not null;
  select coalesce(array_agg(distinct trip_key), '{}') into touched from (
    select trip_key from public.likes where user_key = p_user_key
    union select trip_key from public.comments where author_key = p_user_key) mine
    where trip_key not in (select key from public.trips where owner_key = p_user_key);
  select coalesce(array_agg(distinct person), '{}') into follow_keys from (
    select followee_key as person from public.follows where follower_key = p_user_key
    union select follower_key from public.follows where followee_key = p_user_key) people;

  -- Every published link under every handle they had shows "This Quest was removed.".
  insert into public.removed_trip_urls (url_hash, trip_key, saved_at, saved_by, save_reason)
    select public.trip_url_hash(h, t.slug), t.key, now_ts, p_user_key, 'create'
    from public.trips t, unnest(handles) as h
    where t.owner_key = p_user_key and t.published_at is not null
    on conflict (url_hash) do nothing;

  -- Reactions on their Quests, and theirs on anyone's.
  delete from public.notifications where recipient_key = p_user_key or actor_key = p_user_key
    or saved_by = p_user_key -- like notifications name nobody, but record who caused them
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.likes_archive where user_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.likes where user_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.comments_archive where author_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.comments where author_key = p_user_key
    or trip_key in (select key from public.trips where owner_key = p_user_key);
  delete from public.follows_archive where p_user_key in (follower_key, followee_key);
  delete from public.follows where p_user_key in (follower_key, followee_key);
  delete from public.notification_reads_archive where key = p_user_key;
  delete from public.notification_reads where key = p_user_key;
  delete from public.geocoder_calls where user_key = p_user_key;

  -- Their Quests (legacy rows first), then the profile.
  delete from public.places where trip_id in (select key from public.trips where owner_key = p_user_key);
  delete from public.photos where owner_id = p_user_key;
  delete from public.trip_drafts_archive where key in (select key from public.trips where owner_key = p_user_key);
  delete from public.trip_drafts where owner_key = p_user_key;
  delete from public.trips_archive where key in (select key from public.trips where owner_key = p_user_key);
  delete from public.trips where owner_key = p_user_key;
  delete from public.profiles_archive where key = p_user_key;
  delete from public.profiles where key = p_user_key;

  return jsonb_build_object(
    'liked_or_commented_trip_keys', to_jsonb(touched),
    'follow_profile_keys', to_jsonb(follow_keys),
    'own_trips', own_trips,
    'handles', to_jsonb(handles));
end $$;

-- Step 1 of deleting an account: the marker, so an interrupted deletion can be finished.
create function public.mark_account_deleted(p_user_key uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.deleted_accounts (key, saved_at, saved_by, save_reason)
  values (p_user_key, clock_timestamp(), p_user_key, 'create')
  on conflict (key) do nothing;
$$;

-- Deletions to finish: a marker whose user still has an auth row or any data left.
create function public.list_pending_deletions() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(d.key order by d.saved_at), '{}') from public.deleted_accounts d
  where exists (select 1 from auth.users u where u.id = d.key)
     or exists (select 1 from public.profiles p where p.key = d.key)
     or exists (select 1 from public.trips t where t.owner_key = d.key)
     or exists (select 1 from public.trips_archive t where t.owner_key = d.key)
     or exists (select 1 from public.profiles_archive p where p.key = d.key);
$$;

-- 8. Weekly cleanup gains follows and finished deletion markers (ages: spec A C-A12, to confirm).
create or replace function public.run_retention_cleanup(p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.trips_archive where archived_at < p_now - interval '180 days';
  delete from public.trip_drafts_archive where archived_at < p_now - interval '180 days';
  delete from public.profiles_archive where archived_at < p_now - interval '180 days';
  delete from public.geocoder_calls where called_at < p_now - interval '1 day';
  delete from public.likes_archive where archived_at < p_now - interval '90 days';
  delete from public.comments_archive where archived_at < p_now - interval '90 days';
  delete from public.follows_archive where archived_at < p_now - interval '90 days';
  delete from public.notification_reads_archive where archived_at < p_now - interval '180 days';
  delete from public.notifications where saved_at < p_now - interval '365 days';
  delete from public.email_send_log where saved_at < p_now - interval '7 days';
  -- Only finished deletions: never a marker whose user still has an auth row or data.
  delete from public.deleted_accounts d
  where d.saved_at < p_now - interval '30 days'
    and not (d.key = any (public.list_pending_deletions()));
end $$;

-- 9. Grants (migration 11: nothing is callable unless granted here).
grant execute on function public.resolve_handle(text), public.list_quest_cards(uuid[]),
  public.list_sitemap_profiles() to anon, authenticated;
grant execute on function public.set_follow(uuid, boolean), public.get_my_follow_state(uuid[]),
  public.list_follows(uuid, text, int, int), public.get_my_quest_counts(),
  public.list_my_comment_trip_keys(), public.save_profile_settings(text, jsonb) to authenticated;
grant execute on function public.mark_account_deleted(uuid), public.delete_account_data(uuid),
  public.list_pending_deletions() to service_role;
-- Replaced functions keep their grants: get_profile (anon, authenticated) and
-- run_retention_cleanup (service_role).
