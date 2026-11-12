-- Trips under decision 0001 (spec A §3.1, §3.10, §4.3, §5 step 3).
-- A trip is one document (content + photos + places on the row). The working copy lives in
-- trip_drafts; trips holds what the public sees. Rows never change: every save archives the
-- live row and inserts the new one under the same key, in one function.

-- 1. Foreign keys first, so no save can cascade into another table. The cover is now a photo
--    key inside the document, and the legacy photos/places tables become frozen copies.
alter table public.trips drop constraint trips_cover_photo_fk;
alter table public.photos drop constraint photos_trip_id_fkey;
alter table public.places drop constraint places_trip_id_fkey;
alter table public.places drop constraint places_photo_id_fkey;
alter table public.photos drop constraint photos_owner_id_fkey;
alter table public.trips drop constraint trips_owner_id_fkey;

drop trigger trips_touch_updated_at on public.trips;
drop function public.touch_updated_at();

-- 2. Keys and the document columns.
alter table public.trips rename column id to key;
alter table public.trips rename column owner_id to owner_key;
alter table public.trips rename column cover_photo_id to cover_photo_key;
alter table public.trips add constraint trips_owner_key_fkey
  foreign key (owner_key) references public.profiles (key) on delete no action deferrable initially deferred;

alter table public.trips
  add column photos                   jsonb       not null default '[]',
  add column places                   jsonb       not null default '[]',
  add column comments_on              boolean     not null default true,
  add column search_text              text        not null default '',
  add column published_draft_saved_at timestamptz,
  add column started_at               timestamptz,
  add column saved_at                 timestamptz,
  add column saved_by                 uuid,
  add column save_reason              text        not null default 'create'
    check (save_reason in ('create', 'save', 'publish', 'visibility', 'comments', 'delete'));

-- Backfill from the legacy tables, in their display order. Absent values are left out of the
-- JSON (jsonb_strip_nulls), as the app writes them.
create temporary table trip_backfill on commit drop as
select
  t.key,
  coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', ph.id, 'width', ph.width, 'height', ph.height, 'caption', ph.caption,
      'takenAt', to_char(ph.taken_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'date', (ph.taken_at at time zone 'UTC')::date
    )) order by ph.sort, ph.id)
    from public.photos ph where ph.trip_id = t.key), '[]'::jsonb) as photos,
  coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', pl.id, 'name', pl.name, 'lat', pl.lat, 'lng', pl.lng, 'geoRef', pl.geo_ref,
      'city', pl.city, 'countryCode', pl.country_code, 'note', pl.note, 'photoId', pl.photo_id
    )) order by pl.sort, pl.id)
    from public.places pl where pl.trip_id = t.key), '[]'::jsonb) as places
from public.trips t;

-- A migration can't use archive + insert for a schema change, so the backfill rebuilds the
-- table once: copy, empty, re-insert. App code never does this.
create temporary table trip_rows on commit drop as select * from public.trips;
delete from public.trips;
insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, short_title,
  start_date, end_date, cover_photo_key, seed, content, word_count, published_at, updated_at,
  photos, places, comments_on, search_text, published_draft_saved_at, started_at,
  saved_at, saved_by, save_reason)
select r.key, r.owner_key, r.slug, r.template_id, r.visibility, r.status, r.title, r.short_title,
  r.start_date, r.end_date, r.cover_photo_key, r.seed, r.content, r.word_count, r.published_at, r.updated_at,
  b.photos, b.places, true,
  lower(concat_ws(' ', r.title, r.content ->> 'destination',
    (select string_agg(place ->> 'name', ' ') from jsonb_array_elements(b.places) as place))),
  null, null, r.updated_at, r.owner_key, 'create'
from trip_rows r join trip_backfill b on b.key = r.key;
-- Run the deferred owner checks now: later ALTER TABLEs in this migration refuse to run while
-- checks are still pending (and a real database has rows here).
set constraints all immediate;

-- updated_at is now saved_at (rows never change); get_trip keeps returning it under the old name.
alter table public.trips drop column updated_at;
alter table public.trips alter column saved_at set not null;
-- Save functions copy these from the live row; an insert that forgets one must fail loudly
-- rather than reshuffle jitter or turn comments back on.
alter table public.trips
  alter column seed drop default,
  alter column visibility drop default,
  alter column status drop default,
  alter column comments_on drop default;

-- 3. Drafts: the working copy, one row per trip key. Autosave archives only these.
create table public.trip_drafts (
  key             uuid        primary key,
  owner_key       uuid        not null,
  template_id     text        not null,
  title           text        check (char_length(title) <= 60),
  short_title     text        check (char_length(short_title) <= 30),
  start_date      date,
  end_date        date        check (end_date is null or start_date is null or end_date >= start_date),
  cover_photo_key uuid,
  content         jsonb       not null,
  photos          jsonb       not null,
  places          jsonb       not null,
  started_at      timestamptz,
  saved_at        timestamptz not null,
  saved_by        uuid,
  save_reason     text        not null
    check (save_reason in ('create', 'save', 'publish', 'visibility', 'comments', 'delete')),
  constraint trip_drafts_key_fkey foreign key (key) references public.trips (key)
    on delete no action deferrable initially deferred,
  constraint trip_drafts_owner_key_fkey foreign key (owner_key) references public.profiles (key)
    on delete no action deferrable initially deferred
);
insert into public.trip_drafts (key, owner_key, template_id, title, short_title, start_date, end_date,
  cover_photo_key, content, photos, places, started_at, saved_at, saved_by, save_reason)
select key, owner_key, template_id, title, short_title, start_date, end_date,
  cover_photo_key, content, photos, places, started_at, saved_at, saved_by, 'create'
from public.trips;
set constraints all immediate;

-- 4. Archives: the live columns plus archived_at. Many rows per key: no other constraints.
create table public.trips_archive (
  key uuid not null, owner_key uuid not null, slug text not null, template_id text not null,
  visibility text not null, status text not null, title text, short_title text,
  start_date date, end_date date, cover_photo_key uuid, seed int not null, content jsonb not null,
  word_count int not null, published_at timestamptz, photos jsonb not null, places jsonb not null,
  comments_on boolean not null, search_text text not null, published_draft_saved_at timestamptz,
  started_at timestamptz, saved_at timestamptz not null, saved_by uuid, save_reason text not null,
  archived_at timestamptz not null,
  primary key (key, saved_at)
);
create table public.trip_drafts_archive (
  key uuid not null, owner_key uuid not null, template_id text not null, title text, short_title text,
  start_date date, end_date date, cover_photo_key uuid, content jsonb not null, photos jsonb not null,
  places jsonb not null, started_at timestamptz, saved_at timestamptz not null, saved_by uuid,
  save_reason text not null, archived_at timestamptz not null,
  primary key (key, saved_at)
);

-- 5. Insert-only tables.
-- A deleted Quest's URL, so its link says "This Quest was removed." and is never reused.
create table public.removed_trip_urls (
  url_hash    text        primary key, -- sha256(lower(handle) || '/' || slug), hex
  trip_key    uuid        not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);
-- Geocoder answers, cached forever (OSM data, ODbL). Written only by lib/geo.ts.
create table public.geocode_cache (
  cache_key   text        primary key,
  result      jsonb       not null, -- {"places": [...]}; [] only when Nominatim answered with nothing
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);
-- One row per Nominatim call: the 1-per-second limiter and per-user limits. Purged after a day.
create table public.geocoder_calls (
  key         uuid        primary key,
  user_key    uuid        not null,
  kind        text        not null check (kind in ('reverse', 'search')),
  called_at   timestamptz not null,
  saved_at    timestamptz not null,
  saved_by    uuid,
  save_reason text        not null check (save_reason = 'create')
);
create index geocoder_calls_by_time on public.geocoder_calls (called_at desc);
create index geocoder_calls_by_user on public.geocoder_calls (user_key, called_at desc);

-- 6. Access. Owners read their own rows; all writes go through the functions below.
drop policy "own trips" on public.trips;
create policy "read own trips" on public.trips for select to authenticated
  using (owner_key = (select auth.uid()));
revoke insert, update, delete on public.trips from authenticated;
revoke update on public.trips from service_role;

-- The legacy tables are frozen copies kept for a rollback; nothing writes to them any more.
revoke insert, update, delete on public.photos, public.places from authenticated;
revoke update on public.photos, public.places from service_role;

alter table public.trip_drafts enable row level security;
alter table public.trips_archive enable row level security;
alter table public.trip_drafts_archive enable row level security;
create policy "read own drafts" on public.trip_drafts for select to authenticated
  using (owner_key = (select auth.uid()));
create policy "read own archived trips" on public.trips_archive for select to authenticated
  using (owner_key = (select auth.uid()));
create policy "read own archived drafts" on public.trip_drafts_archive for select to authenticated
  using (owner_key = (select auth.uid()));
revoke all on public.trip_drafts, public.trips_archive, public.trip_drafts_archive
  from anon, authenticated, service_role;
grant select on public.trip_drafts, public.trips_archive, public.trip_drafts_archive
  to authenticated, service_role;

alter table public.removed_trip_urls enable row level security;
alter table public.geocode_cache enable row level security;
alter table public.geocoder_calls enable row level security;
revoke all on public.removed_trip_urls, public.geocode_cache, public.geocoder_calls
  from anon, authenticated, service_role;

-- 7. Indexes. Trigram search on search_text is for spec C; skipped where pg_trgm isn't
--    installed (PGlite tests).
-- trips_by_owner already covers (owner_key, status, visibility, published_at desc) after the rename.
alter index public.trips_by_owner rename to trips_by_owner_key;
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_trgm') then
    create schema if not exists extensions;
    create extension if not exists pg_trgm with schema extensions;
    execute 'create index trips_search_text on public.trips using gin (search_text extensions.gin_trgm_ops)';
  end if;
end $$;

-- 8. Write functions. Each one: owner check, lock the live row, compare saved_at (OQ409), archive,
--    delete, insert with an explicit column list (no column defaults), return saved_at as text.
--    Error codes: OQ401 not signed in, OQ404 not found / not yours, OQ409 conflict,
--    OQ410 key already used, OQ422 invalid (photo counts, title, slug, document shape).

create function public.trip_url_hash(p_handle text, p_slug text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(lower(p_handle) || '/' || lower(p_slug), 'UTF8')), 'hex');
$$;

create function public.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'OQ401';
  end if;
  return auth.uid();
end $$;

-- A row that disappeared while we waited for its lock was replaced by a concurrent save:
-- that's a conflict, not "not found".
create function public.raise_missing(p_table text, p_key uuid, p_owner uuid) returns void
language plpgsql set search_path = '' as $$
declare
  still_there boolean;
begin
  execute format('select exists (select 1 from public.%I where key = $1 and owner_key = $2)', p_table)
    into still_there using p_key, p_owner;
  if still_there then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;
  raise exception 'not found' using errcode = 'OQ404';
end $$;

create function public.archive_trip(p_row public.trips, p_now timestamptz) returns void
language sql set search_path = '' as $$
  insert into public.trips_archive (key, owner_key, slug, template_id, visibility, status, title,
    short_title, start_date, end_date, cover_photo_key, seed, content, word_count, published_at,
    photos, places, comments_on, search_text, published_draft_saved_at, started_at, saved_at,
    saved_by, save_reason, archived_at)
  values ((p_row).key, (p_row).owner_key, (p_row).slug, (p_row).template_id, (p_row).visibility,
    (p_row).status, (p_row).title, (p_row).short_title, (p_row).start_date, (p_row).end_date,
    (p_row).cover_photo_key, (p_row).seed, (p_row).content, (p_row).word_count, (p_row).published_at,
    (p_row).photos, (p_row).places, (p_row).comments_on, (p_row).search_text,
    (p_row).published_draft_saved_at, (p_row).started_at, (p_row).saved_at, (p_row).saved_by,
    (p_row).save_reason, p_now);
  delete from public.trips where key = (p_row).key;
$$;

-- Inserts a trips row: the given row's values, with metadata set here.
create function public.insert_trip(p_row public.trips, p_now timestamptz, p_by uuid, p_reason text)
returns void language sql set search_path = '' as $$
  insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, short_title,
    start_date, end_date, cover_photo_key, seed, content, word_count, published_at, photos, places,
    comments_on, search_text, published_draft_saved_at, started_at, saved_at, saved_by, save_reason)
  values ((p_row).key, (p_row).owner_key, (p_row).slug, (p_row).template_id, (p_row).visibility,
    (p_row).status, (p_row).title, (p_row).short_title, (p_row).start_date, (p_row).end_date,
    (p_row).cover_photo_key, (p_row).seed, (p_row).content, (p_row).word_count, (p_row).published_at,
    (p_row).photos, (p_row).places, (p_row).comments_on, (p_row).search_text,
    (p_row).published_draft_saved_at, (p_row).started_at, p_now, p_by, p_reason);
$$;

create function public.archive_draft(p_row public.trip_drafts, p_now timestamptz) returns void
language sql set search_path = '' as $$
  insert into public.trip_drafts_archive (key, owner_key, template_id, title, short_title, start_date,
    end_date, cover_photo_key, content, photos, places, started_at, saved_at, saved_by, save_reason,
    archived_at)
  values ((p_row).key, (p_row).owner_key, (p_row).template_id, (p_row).title, (p_row).short_title,
    (p_row).start_date, (p_row).end_date, (p_row).cover_photo_key, (p_row).content, (p_row).photos,
    (p_row).places, (p_row).started_at, (p_row).saved_at, (p_row).saved_by, (p_row).save_reason, p_now);
  delete from public.trip_drafts where key = (p_row).key;
$$;

-- Starts a Quest on "Next" in Pick photos. The key was made in the browser at the first pick, so
-- uploads could start before this row existed.
create function public.create_trip(p_key uuid, p_template_id text default 'beach') returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key   uuid := public.require_user();
  now_ts     timestamptz := clock_timestamp();
  settings   jsonb;
  empty      jsonb := '{"favourites": [], "days": []}';
begin
  select p.settings into settings from public.profiles p where p.key = user_key;
  if not found then
    raise exception 'no profile' using errcode = 'OQ404';
  end if;
  if exists (select 1 from public.trips where key = p_key)
     or exists (select 1 from public.trips_archive where key = p_key) then
    raise exception 'key already used' using errcode = 'OQ410';
  end if;

  insert into public.trips (key, owner_key, slug, template_id, visibility, status, title, short_title,
    start_date, end_date, cover_photo_key, seed, content, word_count, published_at, photos, places,
    comments_on, search_text, published_draft_saved_at, started_at, saved_at, saved_by, save_reason)
  values (p_key, user_key, 'trip-' || substr(md5(random()::text || p_key::text), 1, 6), p_template_id,
    coalesce(settings ->> 'defaultVisibility', 'public'), 'draft', null, null, null, null, null,
    floor(random() * 2147483647)::int, empty, 0, null, '[]', '[]', true, '', null, null,
    now_ts, user_key, 'create');

  insert into public.trip_drafts (key, owner_key, template_id, title, short_title, start_date, end_date,
    cover_photo_key, content, photos, places, started_at, saved_at, saved_by, save_reason)
  values (p_key, user_key, p_template_id, null, null, null, null, null, empty, '[]', '[]', null,
    now_ts, user_key, 'create');

  return now_ts::text;
end $$;

-- Autosave. The document is validated by the server action (QuestDocumentSchema); here only what
-- the database must guarantee: the shape, and at most 15 photos.
create function public.save_trip_draft(p_key uuid, p_based_on text, p_document jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  live     public.trip_drafts;
begin
  if jsonb_typeof(p_document -> 'content') is distinct from 'object'
     or jsonb_typeof(p_document -> 'photos') is distinct from 'array'
     or jsonb_typeof(p_document -> 'places') is distinct from 'array'
     or coalesce(p_document ->> 'templateId', '') = '' then
    raise exception 'invalid document' using errcode = 'OQ422';
  end if;
  if jsonb_array_length(p_document -> 'photos') > 15 then
    raise exception 'too many photos' using errcode = 'OQ422';
  end if;

  select * into live from public.trip_drafts where key = p_key and owner_key = user_key for update;
  if live.key is null then
    perform public.raise_missing('trip_drafts', p_key, user_key);
  end if;
  if live.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;

  perform public.archive_draft(live, now_ts);
  insert into public.trip_drafts (key, owner_key, template_id, title, short_title, start_date, end_date,
    cover_photo_key, content, photos, places, started_at, saved_at, saved_by, save_reason)
  values (live.key, live.owner_key, p_document ->> 'templateId', p_document ->> 'title',
    p_document ->> 'shortTitle', (p_document ->> 'startDate')::date, (p_document ->> 'endDate')::date,
    (p_document ->> 'coverPhotoId')::uuid, p_document -> 'content', p_document -> 'photos',
    p_document -> 'places', (p_document ->> 'startedAt')::timestamptz, now_ts, user_key, 'save');
  return now_ts::text;
end $$;

-- Copies the draft to the public row. Checks both saved_at values, so a stale tab can't overwrite
-- a newer published version. The slug is set on the first publish and never changes after.
create function public.publish_trip(p_key uuid, p_based_on_draft text, p_based_on_trip text,
  p_visibility text, p_title text, p_slug text, p_word_count int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  user_key  uuid := public.require_user();
  now_ts    timestamptz := clock_timestamp();
  trip      public.trips;
  draft     public.trip_drafts;
  photo_count int;
  title     text := trim(p_title);
  new_slug  text;
  attempt   int := 1;
  first     boolean;
  next_row  public.trips;
begin
  select * into trip from public.trips where key = p_key and owner_key = user_key for update;
  if trip.key is null then
    perform public.raise_missing('trips', p_key, user_key);
  end if;
  select * into draft from public.trip_drafts where key = p_key and owner_key = user_key for update;
  if draft.key is null then
    perform public.raise_missing('trip_drafts', p_key, user_key);
  end if;
  if trip.saved_at::text <> p_based_on_trip or draft.saved_at::text <> p_based_on_draft then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;

  photo_count := jsonb_array_length(draft.photos);
  if photo_count < 3 then
    raise exception 'too few photos' using errcode = 'OQ422';
  elsif photo_count > 15 then
    raise exception 'too many photos' using errcode = 'OQ422';
  end if;
  if p_visibility not in ('public', 'unlisted', 'private') then
    raise exception 'invalid visibility' using errcode = 'OQ422';
  end if;
  if title is null or char_length(title) not between 1 and 60 then
    raise exception 'invalid title' using errcode = 'OQ422';
  end if;

  first := trip.published_at is null;
  if first then
    if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 77 then
      raise exception 'invalid slug' using errcode = 'OQ422';
    end if;
    -- Unique among the owner's live Quests and every removed URL under any handle they've had,
    -- so a deleted Quest's link never starts opening a newer one.
    new_slug := p_slug;
    while exists (select 1 from public.trips t where t.owner_key = user_key and t.slug = new_slug and t.key <> p_key)
       or exists (
         select 1 from public.handle_claims c join public.removed_trip_urls r
           on r.url_hash = public.trip_url_hash(c.handle, new_slug)
         where c.profile_key = user_key) loop
      attempt := attempt + 1;
      new_slug := p_slug || '-' || attempt;
    end loop;
  else
    new_slug := trip.slug;
  end if;

  next_row := trip;
  next_row.slug := new_slug;
  next_row.template_id := draft.template_id;
  next_row.visibility := p_visibility;
  next_row.status := 'published';
  next_row.title := title;
  next_row.short_title := draft.short_title;
  next_row.start_date := draft.start_date;
  next_row.end_date := draft.end_date;
  next_row.cover_photo_key := draft.cover_photo_key;
  next_row.content := draft.content;
  next_row.word_count := greatest(coalesce(p_word_count, 0), 0);
  next_row.published_at := coalesce(trip.published_at, now_ts);
  next_row.photos := draft.photos;
  next_row.places := draft.places;
  next_row.search_text := lower(concat_ws(' ', title, draft.content ->> 'destination',
    (select string_agg(place ->> 'name', ' ') from jsonb_array_elements(draft.places) as place)));
  next_row.published_draft_saved_at := draft.saved_at;
  next_row.started_at := draft.started_at;

  perform public.archive_trip(trip, now_ts);
  perform public.insert_trip(next_row, now_ts, user_key, 'publish');
  return jsonb_build_object('saved_at', now_ts::text, 'slug', new_slug, 'first_publish', first);
end $$;

-- Visibility and comments: a new trips row with one field changed. The URL never changes.
create function public.set_trip_visibility(p_key uuid, p_based_on text, p_visibility text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  trip     public.trips;
  next_row public.trips;
begin
  if p_visibility not in ('public', 'unlisted', 'private') then
    raise exception 'invalid visibility' using errcode = 'OQ422';
  end if;
  select * into trip from public.trips where key = p_key and owner_key = user_key for update;
  if trip.key is null then
    perform public.raise_missing('trips', p_key, user_key);
  end if;
  if trip.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;
  next_row := trip;
  next_row.visibility := p_visibility;
  perform public.archive_trip(trip, now_ts);
  perform public.insert_trip(next_row, now_ts, user_key, 'visibility');
  return now_ts::text;
end $$;

create function public.set_trip_comments(p_key uuid, p_based_on text, p_on boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  user_key uuid := public.require_user();
  now_ts   timestamptz := clock_timestamp();
  trip     public.trips;
  next_row public.trips;
begin
  select * into trip from public.trips where key = p_key and owner_key = user_key for update;
  if trip.key is null then
    perform public.raise_missing('trips', p_key, user_key);
  end if;
  if trip.saved_at::text <> p_based_on then
    raise exception 'conflict' using errcode = 'OQ409';
  end if;
  next_row := trip;
  next_row.comments_on := coalesce(p_on, true);
  perform public.archive_trip(trip, now_ts);
  perform public.insert_trip(next_row, now_ts, user_key, 'comments');
  return now_ts::text;
end $$;

-- The one real delete (0001 rule 7): live row, draft, archives and legacy rows, in an explicit
-- order. A published Quest leaves a tombstone under every handle the owner has had, so its old
-- links say "This Quest was removed." Storage files are removed by the action first.
-- Specs B and C replace this function to delete their child rows first.
create function public.delete_trip(p_key uuid) returns jsonb
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

  delete from public.places where trip_id = p_key;
  delete from public.photos where trip_id = p_key;
  delete from public.trip_drafts_archive where key = p_key;
  delete from public.trip_drafts where key = p_key;
  delete from public.trips_archive where key = p_key;
  delete from public.trips where key = p_key;
  return jsonb_build_object('handles', to_jsonb(handles), 'slug', trip.slug);
end $$;

revoke execute on function public.trip_url_hash(text, text), public.require_user(),
  public.raise_missing(text, uuid, uuid), public.archive_trip(public.trips, timestamptz),
  public.insert_trip(public.trips, timestamptz, uuid, text),
  public.archive_draft(public.trip_drafts, timestamptz) from public;
revoke execute on function public.create_trip(uuid, text), public.save_trip_draft(uuid, text, jsonb),
  public.publish_trip(uuid, text, text, text, text, text, int),
  public.set_trip_visibility(uuid, text, text), public.set_trip_comments(uuid, text, boolean),
  public.delete_trip(uuid) from public;
grant execute on function public.create_trip(uuid, text), public.save_trip_draft(uuid, text, jsonb),
  public.publish_trip(uuid, text, text, text, text, text, int),
  public.set_trip_visibility(uuid, text, text), public.set_trip_comments(uuid, text, boolean),
  public.delete_trip(uuid) to authenticated;

-- 9. The public functions, from the document columns. Same arguments, every field returned before
--    still returned under the same name (tests/db/getTrip.test.ts). Built from an explicit field
--    list, so owner_key, save metadata, search_text, takenAt, date and placeId never leave.
create or replace function public.get_trip(p_handle text, p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip', jsonb_build_object(
      'id', t.key, 'key', t.key, 'slug', t.slug, 'template_id', t.template_id,
      'visibility', t.visibility, 'status', t.status, 'title', t.title, 'short_title', t.short_title,
      'start_date', t.start_date, 'end_date', t.end_date, 'cover_photo_id', t.cover_photo_key,
      'seed', t.seed, 'content', t.content, 'word_count', t.word_count,
      'published_at', t.published_at, 'updated_at', t.saved_at, 'saved_at', t.saved_at,
      'comments_on', t.comments_on),
    'owner', jsonb_build_object('handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url),
    'photo_folder', t.owner_key::text || '/' || t.key::text,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', photo ->> 'id', 'width', (photo ->> 'width')::int, 'height', (photo ->> 'height')::int,
        'caption', photo ->> 'caption') order by position)
      from jsonb_array_elements(t.photos) with ordinality as list (photo, position)), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', place ->> 'id', 'name', place ->> 'name', 'lat', (place ->> 'lat')::double precision,
        'lng', (place ->> 'lng')::double precision, 'note', place ->> 'note',
        'photo_id', place ->> 'photoId') order by position)
      from jsonb_array_elements(t.places) with ordinality as list (place, position)), '[]'::jsonb)
  )
  from public.trips t
  join public.profiles p on p.key = t.owner_key
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
    select tr.* from public.trips tr join p on tr.owner_key = p.key
    where tr.status = 'published' and tr.visibility = 'public'
  ),
  pl as (
    select place ->> 'name' as name, (place ->> 'lat')::double precision as lat,
      (place ->> 'lng')::double precision as lng, place ->> 'geoRef' as geo_ref,
      place ->> 'countryCode' as country_code, t.slug as trip_slug, t.published_at, position
    from t, jsonb_array_elements(t.places) with ordinality as list (place, position)
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
        'id', key, 'slug', slug, 'title', title, 'short_title', short_title, 'template_id', template_id,
        'start_date', start_date, 'end_date', end_date, 'cover_photo_id', cover_photo_key)
        order by published_at desc)
      from t), '[]'::jsonb),
    'pins', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'lat', lat, 'lng', lng, 'trip_slug', trip_slug)
        order by published_at desc, position)
      from pl), '[]'::jsonb)
  )
  where exists (select 1 from p);
$$;

create or replace function public.list_sitemap_trips()
returns table (handle text, slug text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, t.slug, t.saved_at
  from public.trips t
  join public.profiles p on p.key = t.owner_key
  where t.status = 'published' and t.visibility = 'public' and t.word_count >= 80
  order by t.saved_at desc;
$$;

-- 10. Geocoder (spec A §3.4). Called only by lib/geo.ts with the service role.
create function public.geocode_cache_get(p_keys text[]) returns table (cache_key text, result jsonb)
language sql stable security definer set search_path = '' as $$
  select c.cache_key, c.result from public.geocode_cache c where c.cache_key = any (p_keys);
$$;

create function public.geocode_cache_put(p_key text, p_result jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.geocode_cache (cache_key, result, saved_at, saved_by, save_reason)
  values (p_key, p_result, clock_timestamp(), null, 'create')
  on conflict (cache_key) do nothing;
$$;

-- One Nominatim request a second across every server instance. Returns 0 (go now, the call is
-- logged), the milliseconds to wait before asking again, or -1 when this user has hit their
-- limit (10 reverse lookups or 20 searches in 10 minutes). The caller waits outside any
-- transaction, so no connection is held while waiting.
create function public.claim_geocoder_slot(p_user_key uuid, p_kind text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  now_ts   timestamptz := clock_timestamp();
  last_call timestamptz;
  wait_ms  integer;
  max_calls integer := case p_kind when 'reverse' then 10 else 20 end;
begin
  if p_kind not in ('reverse', 'search') then
    raise exception 'invalid kind' using errcode = 'OQ422';
  end if;
  perform pg_advisory_xact_lock(hashtext('onquest.geocoder'));
  if (select count(*) from public.geocoder_calls
      where user_key = p_user_key and kind = p_kind and called_at > now_ts - interval '10 minutes')
     >= max_calls then
    return -1;
  end if;
  select max(called_at) into last_call from public.geocoder_calls;
  wait_ms := ceil(1000 - extract(epoch from (now_ts - coalesce(last_call, now_ts - interval '1 second'))) * 1000);
  if wait_ms > 0 then
    return wait_ms;
  end if;
  insert into public.geocoder_calls (key, user_key, kind, called_at, saved_at, saved_by, save_reason)
  values (gen_random_uuid(), p_user_key, p_kind, now_ts, now_ts, null, 'create');
  return 0;
end $$;

revoke execute on function public.geocode_cache_get(text[]), public.geocode_cache_put(text, jsonb),
  public.claim_geocoder_slot(uuid, text) from public;
grant execute on function public.geocode_cache_get(text[]), public.geocode_cache_put(text, jsonb),
  public.claim_geocoder_slot(uuid, text) to service_role;

-- 11. Weekly cleanup (spec A §3.1; ages proposed, CTO to confirm C-A12). Deleting archived rows
--     needs the decision 0001 amendment (C-A16) before this ships. Specs B and C replace this
--     function to add their tables.
create function public.run_retention_cleanup(p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.trips_archive where archived_at < p_now - interval '180 days';
  delete from public.trip_drafts_archive where archived_at < p_now - interval '180 days';
  delete from public.profiles_archive where archived_at < p_now - interval '180 days';
  delete from public.geocoder_calls where called_at < p_now - interval '1 day';
end $$;
revoke execute on function public.run_retention_cleanup(timestamptz) from public;
grant execute on function public.run_retention_cleanup(timestamptz) to service_role;

-- Sunday 03:00 UTC. Skipped where pg_cron isn't installed (PGlite tests call the function).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('onquest-retention-cleanup', '0 3 * * 0', 'select public.run_retention_cleanup()');
  end if;
end $$;
