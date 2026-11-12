-- Likes, comments, notifications and Quest status (spec B §3.3–3.5, §4.3, §5). Same rules as
-- migration 9: rows never change, every write goes through a function, foreign keys are
-- deferred so a Quest or profile save (archive + insert) never touches a like or comment.
-- Error codes: OQ401 not signed in, OQ403 not allowed (comments off, not the owner),
-- OQ404 not found / not visible, OQ422 invalid, OQ429 too fast.

-- 1. Tables.
create table public.likes (
  key         uuid        primary key,
  trip_key    uuid        not null,
  user_key    uuid        not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create'),
  unique (trip_key, user_key), -- one like per person, live rows only
  constraint likes_trip_key_fkey foreign key (trip_key) references public.trips (key)
    on delete no action deferrable initially deferred,
  constraint likes_user_key_fkey foreign key (user_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
create index likes_by_trip on public.likes (trip_key);
create table public.likes_archive (
  key uuid not null, trip_key uuid not null, user_key uuid not null, saved_at timestamptz not null,
  saved_by uuid, save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

create table public.comments (
  key         uuid        primary key,
  trip_key    uuid        not null,
  author_key  uuid        not null,
  body        text        not null check (char_length(body) between 1 and 300),
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create'),
  constraint comments_trip_key_fkey foreign key (trip_key) references public.trips (key)
    on delete no action deferrable initially deferred,
  constraint comments_author_key_fkey foreign key (author_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
create index comments_by_trip on public.comments (trip_key, saved_at);
create index comments_by_author on public.comments (author_key);
create table public.comments_archive (
  key uuid not null, trip_key uuid not null, author_key uuid not null, body text not null,
  saved_at timestamptz not null, saved_by uuid, save_reason text not null,
  archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- Insert-only. A like notification stores no actor: the creator learns that someone liked
-- their Quest, never who. comment_key has no foreign key: a deleted comment is archived and the
-- bell then says "commented on your Quest".
create table public.notifications (
  key           uuid        primary key,
  recipient_key uuid        not null,
  kind          text        not null check (kind in ('like', 'comment', 'follow')),
  actor_key     uuid,
  trip_key      uuid,
  comment_key   uuid,
  saved_at      timestamptz not null,
  saved_by      uuid,
  save_reason   text        not null check (save_reason = 'create'),
  check (kind <> 'like' or actor_key is null),
  constraint notifications_recipient_key_fkey foreign key (recipient_key) references public.profiles (key)
    on delete no action deferrable initially deferred,
  constraint notifications_actor_key_fkey foreign key (actor_key) references public.profiles (key)
    on delete no action deferrable initially deferred,
  constraint notifications_trip_key_fkey foreign key (trip_key) references public.trips (key)
    on delete no action deferrable initially deferred
);
create index notifications_by_recipient on public.notifications (recipient_key, saved_at desc);

-- "Read" is a record too: one row per user, moved forward when the bell is opened.
create table public.notification_reads (
  key         uuid        primary key, -- the user's key
  seen_until  timestamptz not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason in ('create', 'save')),
  constraint notification_reads_key_fkey foreign key (key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
create table public.notification_reads_archive (
  key uuid not null, seen_until timestamptz not null, saved_at timestamptz not null,
  saved_by uuid, save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- Counts notification emails against Resend's free 100 a day (shared with sign-in links).
-- No recipient, no address: only that an email of this kind went out.
create table public.email_send_log (
  key         uuid        primary key,
  kind        text        not null check (kind in ('like', 'comment', 'follow')),
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);
create index email_send_log_by_time on public.email_send_log (saved_at);

-- 2. Access: owners read their own rows; comments only through get_trip_social; all writes
--    through the functions below.
alter table public.likes enable row level security;
alter table public.likes_archive enable row level security;
alter table public.comments enable row level security;
alter table public.comments_archive enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.notification_reads_archive enable row level security;
alter table public.email_send_log enable row level security;

create policy "read own likes" on public.likes for select to authenticated
  using (user_key = (select auth.uid()));
create policy "read own archived likes" on public.likes_archive for select to authenticated
  using (user_key = (select auth.uid()));
create policy "read own archived comments" on public.comments_archive for select to authenticated
  using (author_key = (select auth.uid()));
create policy "read own notifications" on public.notifications for select to authenticated
  using (recipient_key = (select auth.uid()));
create policy "read own notification reads" on public.notification_reads for select to authenticated
  using (key = (select auth.uid()));
create policy "read own archived notification reads" on public.notification_reads_archive
  for select to authenticated using (key = (select auth.uid()));

revoke all on public.likes, public.likes_archive, public.comments, public.comments_archive,
  public.notifications, public.notification_reads, public.notification_reads_archive,
  public.email_send_log from anon, authenticated, service_role;
grant select on public.likes, public.likes_archive, public.comments_archive, public.notifications,
  public.notification_reads, public.notification_reads_archive to authenticated, service_role;
grant select on public.comments to service_role;

-- 3. Who may see a Quest: published public or unlisted, or its owner.
create function public.can_see_trip(p_trip_key uuid, p_user_key uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.trips t
    where t.key = p_trip_key
      and ((t.status = 'published' and t.visibility in ('public', 'unlisted')) or t.owner_key = p_user_key)
  );
$$;

-- 4. Likes (spec B §3.3). "Set state", not an edit, so no saved_at to conflict on: repeated taps
--    never add likes. Notifies only on the first like ever from that person on that Quest.
create function public.set_like(p_trip_key uuid, p_liked boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  liker    uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  trip_owner uuid;
  live     public.likes;
  notified boolean := false;
begin
  if not public.can_see_trip(p_trip_key, liker) then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  select owner_key into trip_owner from public.trips where key = p_trip_key;
  -- Serialises one person's taps on one Quest, so two at once can't both insert.
  perform pg_advisory_xact_lock(hashtext(p_trip_key::text || '/' || liker::text));
  select * into live from public.likes where trip_key = p_trip_key and likes.user_key = liker;

  if p_liked and live.key is null then
    if trip_owner <> liker and not exists (
      select 1 from public.likes_archive a where a.trip_key = p_trip_key and a.user_key = liker
    ) then
      insert into public.notifications (key, recipient_key, kind, actor_key, trip_key, comment_key,
        saved_at, saved_by, save_reason)
      values (gen_random_uuid(), trip_owner, 'like', null, p_trip_key, null, now_ts, liker, 'create');
      notified := true;
    end if;
    insert into public.likes (key, trip_key, user_key, saved_at, saved_by, save_reason)
    values (gen_random_uuid(), p_trip_key, liker, now_ts, liker, 'create');
  elsif not p_liked and live.key is not null then
    insert into public.likes_archive (key, trip_key, user_key, saved_at, saved_by, save_reason, archived_at)
    values (live.key, live.trip_key, live.user_key, live.saved_at, live.saved_by, live.save_reason, now_ts);
    delete from public.likes where key = live.key;
  end if;

  return jsonb_build_object(
    'liked', p_liked,
    -- The owner was told (bell): the server sends the matching email.
    'notified', notified,
    'like_count', (select count(*) from public.likes where trip_key = p_trip_key));
end $$;

-- 5. Comments (spec B §3.4).
create function public.post_comment(p_trip_key uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  trip     public.trips;
  new_body text := trim(p_body);
  new_key  uuid := gen_random_uuid();
begin
  if new_body is null or char_length(new_body) not between 1 and 300 then
    raise exception 'invalid comment' using errcode = 'OQ422';
  end if;
  if not public.can_see_trip(p_trip_key, user_key) then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  select * into trip from public.trips where key = p_trip_key;
  if trip.status <> 'published' then
    raise exception 'not visible' using errcode = 'OQ404';
  end if;
  if not trip.comments_on then
    raise exception 'comments off' using errcode = 'OQ403';
  end if;
  perform pg_advisory_xact_lock(hashtext('comment/' || user_key::text));
  if (select count(*) from public.comments c
      where c.author_key = user_key and c.saved_at > now_ts - interval '1 minute') >= 5 then
    raise exception 'too fast' using errcode = 'OQ429';
  end if;

  insert into public.comments (key, trip_key, author_key, body, saved_at, saved_by, save_reason)
  values (new_key, p_trip_key, user_key, new_body, now_ts, user_key, 'create');
  if trip.owner_key <> user_key then
    insert into public.notifications (key, recipient_key, kind, actor_key, trip_key, comment_key,
      saved_at, saved_by, save_reason)
    values (gen_random_uuid(), trip.owner_key, 'comment', user_key, p_trip_key, new_key, now_ts, user_key, 'create');
  end if;
  return jsonb_build_object('key', new_key, 'saved_at', now_ts::text);
end $$;

-- Only the Quest's owner deletes comments (abuse: one tap). The comment is archived for 90 days.
create function public.delete_comment(p_comment_key uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  live     public.comments;
begin
  select * into live from public.comments where key = p_comment_key for update;
  if live.key is null then
    raise exception 'not found' using errcode = 'OQ404';
  end if;
  if not exists (select 1 from public.trips t where t.key = live.trip_key and t.owner_key = user_key) then
    raise exception 'not owner' using errcode = 'OQ403';
  end if;
  insert into public.comments_archive (key, trip_key, author_key, body, saved_at, saved_by, save_reason, archived_at)
  values (live.key, live.trip_key, live.author_key, live.body, live.saved_at, user_key, 'delete', now_ts);
  delete from public.comments where key = live.key;
  return live.trip_key; -- for the trip-social cache tag
end $$;

-- 6. Public reads. Likes are anonymous: only a count, never who.
create function public.get_trip_social(p_trip_key uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'like_count', (select count(*) from public.likes l where l.trip_key = t.key),
    'comments_on', t.comments_on,
    -- Comments off hides every comment, the count included.
    'comment_count', case when t.comments_on
      then (select count(*) from public.comments c where c.trip_key = t.key) else 0 end,
    'comments', case when t.comments_on then coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', c.key, 'body', c.body, 'saved_at', c.saved_at,
        'author', jsonb_build_object('key', p.key, 'handle', p.handle, 'name', coalesce(p.name, p.handle),
          'avatar_url', p.avatar_url)) order by c.saved_at, c.key)
      from (select * from public.comments c where c.trip_key = t.key order by c.saved_at desc, c.key desc limit 100) c
      join public.profiles p on p.key = c.author_key), '[]'::jsonb) else '[]'::jsonb end
  )
  from public.trips t
  where t.key = p_trip_key and t.status = 'published' and t.visibility in ('public', 'unlisted');
$$;

-- What the signed-in viewer needs that the cached page can't know.
create function public.get_my_quest_state(p_trip_key uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'liked', exists (select 1 from public.likes l where l.trip_key = p_trip_key and l.user_key = auth.uid()),
    'is_owner', exists (select 1 from public.trips t where t.key = p_trip_key and t.owner_key = auth.uid()));
$$;

-- 7. Unavailable links (spec B §3.2). Only the word, never the key: a private Quest's key must not
--    leak to whoever has its URL.
create function public.get_trip_status(p_handle text, p_slug text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (
      select 1 from public.trips t join public.profiles p on p.key = t.owner_key
      where p.handle = lower(p_handle) and t.slug = lower(p_slug)
        and t.status = 'published' and t.visibility = 'private') then 'private'
    when exists (
      select 1 from public.removed_trip_urls r
      where r.url_hash = public.trip_url_hash(p_handle, p_slug)) then 'removed'
  end;
$$;

-- The key, for the quest_unavailable server event only. Service role: never reaches a browser.
create function public.get_unavailable_trip_key(p_handle text, p_slug text) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select t.key from public.trips t join public.profiles p on p.key = t.owner_key
     where p.handle = lower(p_handle) and t.slug = lower(p_slug)
       and t.status = 'published' and t.visibility = 'private'),
    (select r.trip_key from public.removed_trip_urls r
     where r.url_hash = public.trip_url_hash(p_handle, p_slug)));
$$;

-- 8. Notifications (spec B §3.5). Likes are grouped per Quest per day ("3 people liked …").
create function public.list_my_notifications(p_limit int default 30, p_before text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (
    select auth.uid() as key,
      coalesce((select r.seen_until from public.notification_reads r where r.key = auth.uid()), '-infinity') as seen_until
  ),
  mine as (
    select n.* from public.notifications n, me
    where n.recipient_key = me.key and (p_before is null or n.saved_at < p_before::timestamptz)
  ),
  grouped as (
    select (array_agg(key order by saved_at desc))[1] as key, 'like'::text as kind, max(saved_at) as saved_at,
      count(*)::int as like_count, null::uuid as actor_key, trip_key, null::uuid as comment_key
    from mine where kind = 'like'
    group by trip_key, (saved_at at time zone 'UTC')::date
    union all
    select key, kind, saved_at, null, actor_key, trip_key, comment_key from mine where kind <> 'like'
  ),
  page as (
    select * from grouped order by saved_at desc, key desc limit least(greatest(coalesce(p_limit, 30), 1), 50)
  )
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'key', g.key, 'kind', g.kind, 'saved_at', g.saved_at, 'unread', g.saved_at > me.seen_until,
    'like_count', g.like_count,
    'actor', case when g.actor_key is not null then (
      select jsonb_build_object('handle', a.handle, 'name', coalesce(a.name, a.handle), 'avatar_url', a.avatar_url)
      from public.profiles a where a.key = g.actor_key) end,
    'quest', case when g.trip_key is not null then (
      select jsonb_build_object('key', t.key, 'title', coalesce(t.title, 'your Quest'),
        'path', '/@' || owner.handle || '/' || t.slug,
        'cover_photo_key', coalesce(t.cover_photo_key::text, t.photos -> 0 ->> 'id'),
        'photo_folder', t.owner_key::text || '/' || t.key::text)
      from public.trips t join public.profiles owner on owner.key = t.owner_key where t.key = g.trip_key) end,
    'comment_excerpt', (select left(c.body, 80) from public.comments c where c.key = g.comment_key)
  )) order by g.saved_at desc, g.key desc), '[]'::jsonb)
  from page g, me;
$$;

create function public.count_unread_notifications() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.notifications n
  where n.recipient_key = auth.uid()
    and n.saved_at > coalesce((select r.seen_until from public.notification_reads r where r.key = auth.uid()), '-infinity');
$$;

-- Opening the bell. Only moves forward, so two devices can't un-read each other: no conflict check.
create function public.mark_notifications_seen(p_until text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  wanted   timestamptz := least(p_until::timestamptz, now_ts);
  live     public.notification_reads;
begin
  select * into live from public.notification_reads where key = user_key for update;
  if live.key is not null then
    if live.seen_until >= wanted then
      return live.seen_until::text;
    end if;
    insert into public.notification_reads_archive (key, seen_until, saved_at, saved_by, save_reason, archived_at)
    values (live.key, live.seen_until, live.saved_at, live.saved_by, live.save_reason, now_ts);
    delete from public.notification_reads where key = user_key;
  end if;
  insert into public.notification_reads (key, seen_until, saved_at, saved_by, save_reason)
  values (user_key, wanted, now_ts, user_key, case when live.key is null then 'create' else 'save' end);
  return wanted::text;
end $$;

-- 9. Email (spec B §3.5): the daily budget, and the one-tap unsubscribe.
create function public.claim_email_budget(p_kind text, p_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  now_ts timestamptz := clock_timestamp();
begin
  perform pg_advisory_xact_lock(hashtext('onquest.email_budget'));
  if (select count(*) from public.email_send_log
      where saved_at >= date_trunc('day', now_ts at time zone 'UTC') at time zone 'UTC') >= p_limit then
    return false;
  end if;
  insert into public.email_send_log (key, kind, saved_at, saved_by, save_reason)
  values (gen_random_uuid(), p_kind, now_ts, null, 'create');
  return true;
end $$;

-- Merges settings into a profile (an unsubscribe link turns one switch off). Carries every
-- other column, like save_profile.
create function public.save_profile_settings_as_admin(p_key uuid, p_settings jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  now_ts timestamptz := clock_timestamp();
  live   public.profiles;
begin
  select * into live from public.profiles where key = p_key for update;
  if live.key is null then
    raise exception 'not found' using errcode = 'OQ404';
  end if;
  insert into public.profiles_archive (key, handle, name, bio, home_city, avatar_url, created_at,
    settings, saved_at, saved_by, save_reason, archived_at)
  values (live.key, live.handle, live.name, live.bio, live.home_city, live.avatar_url, live.created_at,
    live.settings, live.saved_at, live.saved_by, live.save_reason, now_ts);
  delete from public.profiles where key = p_key;
  insert into public.profiles (key, handle, name, bio, home_city, avatar_url, created_at,
    settings, saved_at, saved_by, save_reason)
  values (live.key, live.handle, live.name, live.bio, live.home_city, live.avatar_url, live.created_at,
    live.settings || coalesce(p_settings, '{}'::jsonb), now_ts, null, 'save');
  return now_ts::text;
end $$;

-- 10. Deleting a Quest also deletes its likes, comments and notifications, before the trip rows.
create or replace function public.delete_trip(p_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  trip     public.trips;
  handles  text[];
begin
  select * into trip from public.trips where key = p_key and owner_key = user_key for update;
  if trip.key is null then
    raise exception 'not found' using errcode = 'OQ404';
  end if;
  select coalesce(array_agg(handle order by saved_at), '{}') into handles
    from public.handle_claims where profile_key = user_key;

  if trip.published_at is not null then
    insert into public.removed_trip_urls (url_hash, trip_key, saved_at, saved_by, save_reason)
      select public.trip_url_hash(h, trip.slug), p_key, now_ts, user_key, 'create' from unnest(handles) as h
      on conflict (url_hash) do nothing;
  end if;

  delete from public.notifications where trip_key = p_key;
  delete from public.likes_archive where trip_key = p_key;
  delete from public.likes where trip_key = p_key;
  delete from public.comments_archive where trip_key = p_key;
  delete from public.comments where trip_key = p_key;
  delete from public.places where trip_id = p_key;
  delete from public.photos where trip_id = p_key;
  delete from public.trip_drafts_archive where key = p_key;
  delete from public.trip_drafts where key = p_key;
  delete from public.trips_archive where key = p_key;
  delete from public.trips where key = p_key;
  return jsonb_build_object('handles', to_jsonb(handles), 'slug', trip.slug);
end $$;

-- 11. Weekly cleanup, now with this migration's tables (ages: spec A C-A12, still to confirm).
create or replace function public.run_retention_cleanup(p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.trips_archive where archived_at < p_now - interval '180 days';
  delete from public.trip_drafts_archive where archived_at < p_now - interval '180 days';
  delete from public.profiles_archive where archived_at < p_now - interval '180 days';
  delete from public.geocoder_calls where called_at < p_now - interval '1 day';
  delete from public.likes_archive where archived_at < p_now - interval '90 days';
  delete from public.comments_archive where archived_at < p_now - interval '90 days';
  delete from public.notification_reads_archive where archived_at < p_now - interval '180 days';
  delete from public.notifications where saved_at < p_now - interval '365 days';
  delete from public.email_send_log where saved_at < p_now - interval '7 days';
end $$;

-- 12. Grants.
revoke execute on function public.can_see_trip(uuid, uuid), public.set_like(uuid, boolean),
  public.post_comment(uuid, text), public.delete_comment(uuid), public.get_trip_social(uuid),
  public.get_my_quest_state(uuid), public.get_trip_status(text, text),
  public.get_unavailable_trip_key(text, text), public.list_my_notifications(int, text),
  public.count_unread_notifications(), public.mark_notifications_seen(text),
  public.claim_email_budget(text, int), public.save_profile_settings_as_admin(uuid, jsonb) from public;
grant execute on function public.get_trip_social(uuid), public.get_trip_status(text, text) to anon, authenticated;
grant execute on function public.set_like(uuid, boolean), public.post_comment(uuid, text),
  public.delete_comment(uuid), public.get_my_quest_state(uuid), public.list_my_notifications(int, text),
  public.count_unread_notifications(), public.mark_notifications_seen(text) to authenticated;
grant execute on function public.get_unavailable_trip_key(text, text), public.claim_email_budget(text, int),
  public.save_profile_settings_as_admin(uuid, jsonb) to service_role;
